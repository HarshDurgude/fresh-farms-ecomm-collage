// API Config
const API_URL = 'http://127.0.0.1:5001/api';

// Global State
let products = [];
let cart = [];
let currentUser = null;
let isAdmin = false;

// Page Navigation
function showPage(pageId) {
    console.log("Showing page:", pageId);
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.add('hidden'));

    const selectedPage = document.getElementById(`${pageId}-page`);
    if (selectedPage) {
        selectedPage.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    if (pageId === 'cart') renderCart();
    else if (pageId === 'checkout') renderCheckoutSummary();
    else if (pageId === 'products') renderProducts('All');
    else if (pageId === 'home') renderFeaturedProducts();
    else if (pageId === 'admin' && isAdmin) renderAdminProducts();
}

// API Calls
async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        products = await response.json();
        renderFeaturedProducts();
    } catch (e) {
        console.error("Error fetching products:", e);
    }
}

// Rendering Products
function renderProducts(filter = 'All') {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const filteredProducts = filter === 'All'
        ? products
        : products.filter(p => p.category === filter);

    filteredProducts.forEach(product => {
        grid.appendChild(createProductCard(product));
    });

    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
        btn.classList.toggle('active', btn.textContent === filter);
    });
}

function renderFeaturedProducts() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    grid.innerHTML = '';
    products.filter(p => p.featured).forEach(product => {
        grid.appendChild(createProductCard(product));
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="product-img">
        <div class="product-info">
            <span class="product-cat">${product.category}</span>
            <h4 class="product-name">${product.name}</h4>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <button class="add-to-cart" onclick="addToCart(${product.id}, event)">Add to Cart</button>
        </div>
    `;
    return card;
}

function filterProducts(category) {
    showPage('products');
    renderProducts(category);
}

// Auth Functions
async function register(event) {
    event.preventDefault();
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    const address = document.getElementById('register-address').value;

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, phone, password, address })
        });
        const data = await response.json();
        if (data.success) {
            alert("Registration successful! Please login.");
            showPage('login');
        } else {
            alert(data.message);
        }
    } catch (e) {
        alert("Registration failed");
    }
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (data.success) {
            currentUser = data.user;
            isAdmin = data.isAdmin;
            updateAuthUI();
            if (isAdmin) showPage('admin');
            else {
                // Load saved cart from DB
                if (data.user.cart) {
                    try {
                        cart = JSON.parse(data.user.cart);
                        updateCartCount();
                    } catch (e) { cart = []; }
                }
                showPage('home');
            }
        } else {
            alert(data.message);
        }
    } catch (e) {
        alert("Login failed");
    }
}

function logout() {
    currentUser = null;
    isAdmin = false;
    cart = [];
    updateAuthUI();
    updateCartCount();
    showPage('home');
}

function updateAuthUI() {
    const authLinks = document.getElementById('auth-links');
    const userInfo = document.getElementById('user-info');
    const userEmailDisplay = document.getElementById('user-email-display');
    const adminLink = document.getElementById('admin-link');

    if (currentUser) {
        authLinks.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userEmailDisplay.textContent = currentUser.email;
        adminLink.classList.toggle('hidden', !isAdmin);
    } else {
        authLinks.classList.remove('hidden');
        userInfo.classList.add('hidden');
    }
}

// Cart Management
function addToCart(productId, event) {
    const product = products.find(p => p.id === productId);
    const cartItem = cart.find(item => item.id === productId);

    if (cartItem) {
        cartItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartCount();
    saveCartToDB();

    if (event && event.target) {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = "Added!";
        btn.style.backgroundColor = "#4a7c2f";
        btn.style.color = "white";
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = "";
            btn.style.color = "";
        }, 1000);
    }
}

async function saveCartToDB() {
    if (!currentUser || isAdmin) return;
    try {
        await fetch(`${API_URL}/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, cart: JSON.stringify(cart) })
        });
    } catch (e) { console.error("Error saving cart:", e); }
}

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) cartCountEl.textContent = count;
}

function changeQty(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) removeFromCart(productId);
        else {
            updateCartCount();
            saveCartToDB();
            renderCart();
        }
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartCount();
    saveCartToDB();
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const summary = document.getElementById('cart-summary');
    const emptyMsg = document.getElementById('empty-cart-msg');

    if (cart.length === 0) {
        container.innerHTML = '';
        summary.classList.add('hidden');
        emptyMsg.classList.remove('hidden');
        return;
    }

    emptyMsg.classList.add('hidden');
    summary.classList.remove('hidden');
    container.innerHTML = '';

    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="changeQty(${item.id}, -1)">-</button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
                    <span class="remove-item" onclick="removeFromCart(${item.id})">Remove</span>
                </div>
            </div>
            <div class="item-total">$${(item.price * item.quantity).toFixed(2)}</div>
        `;
        container.appendChild(itemEl);
    });

    const delivery = 5.00;
    const total = subtotal + delivery;
    document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cart-delivery').textContent = `$${delivery.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
}

// Admin Functions
async function renderAdminProducts() {
    const list = document.getElementById('admin-product-list');
    if (!list) return;
    list.innerHTML = '';
    products.forEach(p => {
        const div = document.createElement('div');
        div.className = 'admin-list-item';
        div.innerHTML = `
            <span>${p.name} (${p.category}) - $${p.price.toFixed(2)}</span>
            <div class="admin-actions">
                <button class="admin-edit-btn" onclick="editProduct(${p.id})">Edit</button>
                <button class="admin-delete-btn" onclick="deleteProduct(${p.id})">Delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function editProduct(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;

    document.getElementById('p-id').value = p.id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-category').value = p.category;
    document.getElementById('p-price').value = p.price;
    document.getElementById('p-image').value = p.image;
    document.getElementById('p-featured').checked = p.featured;

    document.getElementById('admin-form-title').textContent = "Edit Product";
    document.getElementById('admin-form-btn').textContent = "Update Product";
    document.getElementById('cancel-edit-btn').classList.remove('hidden');

    window.scrollTo(0, document.getElementById('admin-page').offsetTop);
}

function resetAdminForm() {
    document.getElementById('add-product-form').reset();
    document.getElementById('p-id').value = '';
    document.getElementById('admin-form-title').textContent = "Add New Product";
    document.getElementById('admin-form-btn').textContent = "Add Product";
    document.getElementById('cancel-edit-btn').classList.add('hidden');
}

async function handleProductSubmit(event) {
    event.preventDefault();
    const id = document.getElementById('p-id').value;
    const product = {
        name: document.getElementById('p-name').value,
        category: document.getElementById('p-category').value,
        price: parseFloat(document.getElementById('p-price').value),
        image: document.getElementById('p-image').value || 'https://via.placeholder.com/400',
        featured: document.getElementById('p-featured').checked
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        const data = await response.json();
        if (data.success) {
            alert(id ? "Product updated!" : "Product added!");
            resetAdminForm();
            await fetchProducts();
            renderAdminProducts();
        }
    } catch (e) { alert("Failed to save product"); }
}

async function deleteProduct(id) {
    if (!confirm("Are you sure?")) return;
    try {
        const response = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            await fetchProducts();
            renderAdminProducts();
        }
    } catch (e) { alert("Failed to delete product"); }
}

async function exportDB() {
    try {
        const response = await fetch(`${API_URL}/export`);
        const data = await response.json();
        alert(data.message);
    } catch (e) { alert("Export failed"); }
}

// Checkout Simulation
function renderCheckoutSummary() {
    const container = document.getElementById('checkout-summary-items');
    if (!container) return;
    container.innerHTML = '';
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
        const div = document.createElement('div');
        div.className = 'summary-row';
        div.innerHTML = `<span>${item.name} x ${item.quantity}</span><span>$${(item.price * item.quantity).toFixed(2)}</span>`;
        container.appendChild(div);
    });
    const total = subtotal + 5.00;
    document.getElementById('checkout-total').textContent = `$${total.toFixed(2)}`;

    // Pre-fill user data
    if (currentUser) {
        document.getElementById('checkout-name').value = currentUser.email.split('@')[0]; // Simple fallback
        document.getElementById('checkout-address').value = currentUser.address || '';
    }
}

async function processPayment(event) {
    event.preventDefault();
    if (!currentUser) {
        alert("Please login to place an order");
        showPage('login');
        return;
    }

    const overlay = document.getElementById('loading-overlay');
    overlay.classList.remove('hidden');

    const orderData = {
        id: 'FF-' + Math.floor(Math.random() * 90000 + 10000),
        date: new Date().toISOString(),
        items: cart,
        total: cart.reduce((t, i) => t + (i.price * i.quantity), 0) + 5.00,
        address: document.getElementById('checkout-address').value
    };

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, order: orderData })
        });
        const data = await response.json();

        if (data.success) {
            setTimeout(() => {
                overlay.classList.add('hidden');
                cart = [];
                updateCartCount();
                showPage('confirmation');
            }, 2000);
        } else {
            alert("Error saving order: " + data.message);
            overlay.classList.add('hidden');
        }
    } catch (e) {
        alert("Payment failed");
        overlay.classList.add('hidden');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    showPage('home');
});
