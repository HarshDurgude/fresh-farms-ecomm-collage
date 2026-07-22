from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import pandas as pd
import json

app = Flask(__name__)
CORS(app)

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'marketplace.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    password = db.Column(db.String(120), nullable=False)
    address = db.Column(db.Text, nullable=True)
    cart_data = db.Column(db.Text, default='[]') # JSON string of cart items
    orders = db.Column(db.Text, default='[]') # JSON string of orders

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    image = db.Column(db.String(255), nullable=True)
    featured = db.Column(db.Boolean, default=False)

# Admin credentials (hard-coded as requested)
ADMIN_EMAIL = "admin@farmfresh.com"
ADMIN_PASSWORD = "admin123"

# Initialize Database with some sample data
def init_db():
    with app.app_context():
        db.create_all()
        # Add initial products if none exist
        if Product.query.count() == 0:
            initial_products = [
                Product(name="Fresh Broccoli", category="Vegetables", price=3.50, image="https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=400&q=80", featured=True),
                Product(name="Organic Apples", category="Fruits", price=4.20, image="https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80", featured=True),
                Product(name="Whole Wheat Grains", category="Grains", price=6.00, image="https://images.unsplash.com/photo-1501265976582-c1e1b0bbaf63?auto=format&fit=crop&w=400&q=80", featured=False),
                Product(name="Vegetables", category="Vegetables", price=2.50, image="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80", featured=True),
                Product(name="Sweet Carrots", category="Vegetables", price=1.80, image="https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=400&q=80", featured=False),
                Product(name="Yellow Bananas", category="Fruits", price=1.20, image="https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=400&q=80", featured=False),
                Product(name="Watermelon", category="Fruits", price=8.50, image="https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=400&q=80", featured=False),
                Product(name="Greek Yogurt", category="Dairy", price=4.50, image="https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80", featured=False)
            ]
            db.session.bulk_save_objects(initial_products)
            db.session.commit()

# Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')
    address = data.get('address')

    if User.query.filter_by(email=email).first():
        return jsonify({"success": False, "message": "User already exists"}), 400

    new_user = User(email=email, phone=phone, password=password, address=address)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"success": True, "message": "User registered successfully"})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    # Check Admin
    if email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
        return jsonify({"success": True, "isAdmin": True, "message": "Admin logged in", "user": {"email": ADMIN_EMAIL}})

    # Check User
    user = User.query.filter_by(email=email, password=password).first()
    if user:
        return jsonify({
            "success": True, 
            "isAdmin": False, 
            "message": "Login successful", 
            "user": {
                "id": user.id,
                "email": user.email,
                "address": user.address,
                "cart": user.cart_data
            }
        })
    
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route('/api/products', methods=['GET'])
def get_products():
    products = Product.query.all()
    return jsonify([{
        "id": p.id,
        "name": p.name,
        "category": p.category,
        "price": p.price,
        "image": p.image,
        "featured": p.featured
    } for p in products])

@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.json
    new_product = Product(
        name=data.get('name'),
        category=data.get('category'),
        price=data.get('price'),
        image=data.get('image', 'https://via.placeholder.com/400'),
        featured=data.get('featured', False)
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify({"success": True, "message": "Product added successfully"})

@app.route('/api/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    product = Product.query.get(id)
    if product:
        db.session.delete(product)
        db.session.commit()
        return jsonify({"success": True, "message": "Product deleted"})
    return jsonify({"success": False, "message": "Product not found"}), 404

@app.route('/api/products/<int:id>', methods=['PUT'])
def update_product(id):
    data = request.json
    product = Product.query.get(id)
    if not product:
        return jsonify({"success": False, "message": "Product not found"}), 404
    
    product.name = data.get('name', product.name)
    product.category = data.get('category', product.category)
    product.price = data.get('price', product.price)
    product.image = data.get('image', product.image)
    product.featured = data.get('featured', product.featured)
    
    db.session.commit()
    return jsonify({"success": True, "message": "Product updated successfully"})

@app.route('/api/cart', methods=['POST'])
def save_cart():
    data = request.json
    email = data.get('email')
    cart_data = data.get('cart')

    user = User.query.filter_by(email=email).first()
    if user:
        user.cart_data = cart_data
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "User not found"}), 404

@app.route('/api/orders', methods=['POST'])
def save_order():
    data = request.json
    email = data.get('email')
    order_details = data.get('order')

    user = User.query.filter_by(email=email).first()
    if user:
        try:
            current_orders = json.loads(user.orders or '[]')
            current_orders.append(order_details)
            user.orders = json.dumps(current_orders)
            user.cart_data = '[]' # Clear cart after order
            db.session.commit()
            return jsonify({"success": True, "message": "Order saved successfully"})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500
    return jsonify({"success": False, "message": "User not found"}), 404

@app.route('/api/export', methods=['GET'])
def export_db():
    try:
        users = User.query.all()
        products = Product.query.all()
        
        users_df = pd.DataFrame([{
            'ID': u.id, 'Email': u.email, 'Phone': u.phone, 'Address': u.address, 'Cart': u.cart_data
        } for u in users])
        
        products_df = pd.DataFrame([{
            'ID': p.id, 'Name': p.name, 'Category': p.category, 'Price': p.price, 'Featured': p.featured
        } for p in products])
        
        with pd.ExcelWriter('marketplace_data.xlsx') as writer:
            users_df.to_excel(writer, sheet_name='Users', index=False)
            products_df.to_excel(writer, sheet_name='Products', index=False)
            
        return jsonify({"success": True, "message": "Database exported to marketplace_data.xlsx"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5001)
