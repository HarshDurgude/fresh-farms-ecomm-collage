// Product Data
const products = [
    { id: 1, name: "Fresh Broccoli", category: "Vegetables", price: 3.50, image: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=400&q=80", featured: true },
    { id: 2, name: "Organic Apples", category: "Fruits", price: 4.20, image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80", featured: true },
    { id: 3, name: "Whole Wheat Grains", category: "Grains", price: 6.00, image: "https://images.unsplash.com/photo-1501265976582-c1e1b0bbaf63?auto=format&fit=crop&w=400&q=80", featured: false },
    { id: 5, name: "Red Tomatoes", category: "Vegetables", price: 2.50, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80", featured: true },
    { id: 6, name: "Sweet Carrots", category: "Vegetables", price: 1.80, image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=400&q=80", featured: false },
    { id: 7, name: "Yellow Bananas", category: "Fruits", price: 1.20, image: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=400&q=80", featured: false },
    { id: 8, name: "Local Honey", category: "Grains", price: 8.50, image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=400&q=80", featured: false },
    { id: 9, name: "Greek Yogurt", category: "Dairy", price: 4.50, image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80", featured: false }
];

let cart = [];
try {
    const savedCart = localStorage.getItem('farmfresh_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
} catch (e) {
    console.error("Error loading cart from localStorage:", e);
    cart = [];
}

// Page Navigation
function showPage(pageId) {
    console.log("Showing page:", pageId);
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.add('hidden'));

    // Show the requested page
    const selectedPage = document.getElementById(`${pageId}-page`);
    if (selectedPage) {
        selectedPage.classList.remove('hidden');
        window.scrollTo(0, 0);
    } else {
        console.warn("Page not found:", pageId);
    }

    // Special logic for certain pages
    if (pageId === 'cart') {
        renderCart();
    } else if (pageId === 'checkout') {
        renderCheckoutSummary();
    } else if (pageId === 'products') {
        renderProducts('All');
    } else if (pageId === 'home') {
        renderFeaturedProducts();
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

    // Update filter buttons
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
        if (btn.textContent === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function renderFeaturedProducts() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const featured = products.filter(p => p.featured);

    featured.forEach(product => {
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

// Filter function for homepage cards
function filterProducts(category) {
    showPage('products');
    renderProducts(category);
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

    updateCart();
    
    // Animation/Feedback
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

function updateCart() {
    try {
        localStorage.setItem('farmfresh_cart', JSON.stringify(cart));
    } catch (e) {
        console.error("Error saving cart to localStorage:", e);
    }
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        cartCountEl.textContent = count;
    }
}

function changeQty(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCart();
            renderCart();
        }
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
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
        div.innerHTML = `
            <span>${item.name} x ${item.quantity}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        `;
        container.appendChild(div);
    });

    const delivery = 5.00;
    const total = subtotal + delivery;
    document.getElementById('checkout-total').textContent = `$${total.toFixed(2)}`;
}

function processPayment(event) {
    event.preventDefault();
    
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.remove('hidden');

    // Simulate network delay
    setTimeout(() => {
        overlay.classList.add('hidden');
        cart = [];
        updateCart();
        showPage('confirmation');
    }, 2000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log("FarmFresh JS initialized");
    updateCart();
    renderFeaturedProducts();
    
    // Check for URL hash (optional enhancement)
    const hash = window.location.hash.substring(1);
    if (hash) {
        showPage(hash);
    } else {
        showPage('home');
    }
});
