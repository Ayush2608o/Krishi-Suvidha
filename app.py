from flask import Flask, send_from_directory, render_template_string, request, jsonify
import os
import requests
import random
import time
from twilio.rest import Client
import json

app = Flask(__name__, static_folder='.', static_url_path='')

# In-memory OTP store (for demo, use DB in production)
otp_store = {}

TWILIO_SID = 'AC2ad07795cd37487094b72db1cd4b9d9e'
TWILIO_AUTH = '20a6b7e58c70dbc4fcb8be176ed4582f'
TWILIO_FROM = '+1 220 888 7941'

client = Client(TWILIO_SID, TWILIO_AUTH)

FARMERS_FILE = 'farmers.json'

def save_farmer_data(data):
    farmers = []
    if os.path.exists(FARMERS_FILE):
        with open(FARMERS_FILE, 'r', encoding='utf-8') as f:
            try:
                farmers = json.load(f)
            except Exception:
                farmers = []
    farmers.append(data)
    with open(FARMERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(farmers, f, ensure_ascii=False, indent=2)

@app.route('/')
def root():
    # Serve index.html at root
    return send_from_directory('.', 'login.html')


@app.route('/<path:path>')
def static_proxy(path):
    # Serve any file in the current directory tree
    if os.path.isdir(path):
        # If a folder is requested directly, try to serve an index.html inside it
        index_path = os.path.join(path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(path, 'index.html')
        # Otherwise show a simple 404 message
        return render_template_string('<h1>404 Not Found</h1>')
    return send_from_directory('.', path)


# ---------------- API: OpenAI chat proxy ----------------
@app.post('/api/chat')
def api_chat():
    try:
        data = request.get_json(silent=True) or {}
        message = (data.get('message') or '').strip()
        if not message:
            return jsonify({ 'error': 'empty_message' }), 400

        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            # Graceful note if no key configured
            return jsonify({ 'error': 'no_api_key', 'answer': 'Backend not configured with OpenAI API key.' }), 500

        # Minimal call to Chat Completions API
        url = 'https://api.openai.com/v1/chat/completions'
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        payload = {
            'model': 'gpt-4o-mini',
            'messages': [
                { 'role': 'system', 'content': 'You are a helpful assistant for a farm products website. Keep answers concise and friendly.' },
                { 'role': 'user', 'content': message }
            ],
            'temperature': 0.3
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        if resp.status_code >= 400:
            return jsonify({ 'error': 'upstream_error', 'status': resp.status_code, 'answer': 'Service temporarily unavailable.' }), 502
        data = resp.json()
        answer = (data.get('choices') or [{}])[0].get('message', {}).get('content', '').strip()
        if not answer:
            answer = 'Sorry, I could not generate a reply right now.'
        return jsonify({ 'answer': answer })
    except Exception as e:
        return jsonify({ 'error': 'exception', 'message': str(e)[:200] }), 500

# ---------------- API: Weather (OpenWeatherMap) ----------------
@app.get('/api/weather')
def api_weather():
    try:
        city = (request.args.get('city') or '').strip()
        if not city:
            return jsonify({ 'error': 'missing_city' }), 400
        api_key = os.environ.get('OPENWEATHER_API_KEY')
        if not api_key:
            return jsonify({ 'error': 'no_api_key', 'message': 'Missing OPENWEATHER_API_KEY' }), 500
        params = {
            'q': city,
            'appid': api_key,
            'units': 'metric'
        }
        r = requests.get('https://api.openweathermap.org/data/2.5/weather', params=params, timeout=20)
        if r.status_code >= 400:
            return jsonify({ 'error': 'upstream_error', 'status': r.status_code }), 502
        data = r.json()
        out = {
            'city': data.get('name'),
            'temp_c': (data.get('main') or {}).get('temp'),
            'feels_like_c': (data.get('main') or {}).get('feels_like'),
            'humidity': (data.get('main') or {}).get('humidity'),
            'wind_ms': (data.get('wind') or {}).get('speed'),
            'weather': ((data.get('weather') or [{}])[0]).get('description')
        }
        return jsonify(out)
    except Exception as e:
        return jsonify({ 'error': 'exception', 'message': str(e)[:200] }), 500

# ---------------- API: Mandi rates (AGMARKNET via data.gov.in) ----------------
@app.get('/api/mandi')
def api_mandi():
    try:
        # Inputs
        state = (request.args.get('state') or '').strip()
        district = (request.args.get('district') or '').strip()
        market = (request.args.get('market') or '').strip()
        commodity = (request.args.get('commodity') or '').strip()
        limit = int(request.args.get('limit') or 25)
        api_key = os.environ.get('AGMARKNET_API_KEY')
        if not api_key:
            return jsonify({ 'error': 'no_api_key', 'message': 'Missing AGMARKNET_API_KEY' }), 500
        # AGMARKNET Prices resource
        resource_id = '9ef84268-d588-465a-a308-a864a43d0070'
        params = {
            'api-key': api_key,
            'format': 'json',
            'resource_id': resource_id,
            'limit': limit,
            'sort': 'arrival_date desc'
        }
        # Build filters
        filters = {}
        if state: filters['state'] = state
        if district: filters['district'] = district
        if market: filters['market'] = market
        if commodity: filters['commodity'] = commodity
        if filters:
            params['filters'] = filters
        r = requests.get('https://api.data.gov.in/resource/{rid}'.format(rid=resource_id), params=params, timeout=25)
        if r.status_code >= 400:
            return jsonify({ 'error': 'upstream_error', 'status': r.status_code }), 502
        data = r.json()
        records = data.get('records') or []
        # Normalize key fields
        out = []
        for rec in records:
            out.append({
                'state': rec.get('state'),
                'district': rec.get('district'),
                'market': rec.get('market'),
                'commodity': rec.get('commodity'),
                'variety': rec.get('variety'),
                'arrival_date': rec.get('arrival_date'),
                'min_price': rec.get('min_price'),
                'max_price': rec.get('max_price'),
                'modal_price': rec.get('modal_price'),
                'unit_of_price': rec.get('price_unit') or 'Rs/Quintal'
            })
        return jsonify({ 'count': len(out), 'results': out })
    except Exception as e:
        return jsonify({ 'error': 'exception', 'message': str(e)[:200] }), 500

# ---------------- API: OTP Authentication ----------------
@app.route('/send_otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    phone = data.get('phone')
    if not phone or len(phone) != 10:
        return jsonify({'success': False, 'message': 'Invalid phone number'}), 400
    otp = str(random.randint(100000, 999999))
    otp_store[phone] = {'otp': otp, 'timestamp': time.time()}
    # Instead of SMS, show OTP in response (for demo)
    return jsonify({'success': True, 'message': f'Your OTP is: {otp}'})

@app.route('/verify_otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    phone = data.get('phone')
    otp = data.get('otp')
    entry = otp_store.get(phone)
    if entry and entry['otp'] == otp and time.time() - entry['timestamp'] < 300:
        # OTP valid for 5 minutes
        return jsonify({'success': True, 'message': 'OTP verified'})
    return jsonify({'success': False, 'message': 'Invalid OTP'}), 400

# ---------------- API: Products (Demo Data) ----------------
@app.route('/api/products')
def api_products():
    # Demo data, आप इसे DB या किसी external API से भी ला सकते हैं
    products = [
        { "name": "Wheat", "category": "Grain", "price": 1200, "units": 820, "stock": "In Stock", "currency": "₹" },
        { "name": "Rice", "category": "Grain", "price": 860, "units": 640, "stock": "In Stock", "currency": "₹" },
        { "name": "Tomato", "category": "Vegetable", "price": 40, "units": 980, "stock": "In Stock", "currency": "₹/kg" },
        { "name": "Green Peas", "category": "Vegetable", "price": 95, "units": 420, "stock": "In Stock", "currency": "₹/kg" },
        { "name": "Pulses", "category": "Grain", "price": 860, "units": 530, "stock": "Low", "currency": "₹" },
        { "name": "Cabbage", "category": "Vegetable", "price": 35, "units": 610, "stock": "In Stock", "currency": "₹/kg" },
        { "name": "Eggplant", "category": "Vegetable", "price": 70, "units": 380, "stock": "Low", "currency": "₹/kg" }
    ]
    return jsonify(products)

# ---------------- API: Orders & Contact (Persistence) ----------------
ORDERS_FILE = 'orders.json'
CONTACTS_FILE = 'contacts.json'

def load_json_file(filepath):
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            try: return json.load(f)
            except: return []
    return []

def save_json_file(filepath, data):
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/api/orders', methods=['GET', 'POST'])
def api_orders():
    if request.method == 'GET':
        return jsonify(load_json_file(ORDERS_FILE))
    
    # POST
    data = request.get_json()
    if not data: return jsonify({'error': 'No data'}), 400
    
    orders = load_json_file(ORDERS_FILE)
    # Ensure ID
    if 'id' not in data:
        data['id'] = f"ORD-{int(time.time())}"
    if 'status' not in data:
        data['status'] = 'Pending'
    data['created_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
    
    orders.insert(0, data)
    save_json_file(ORDERS_FILE, orders)
    return jsonify({'success': True, 'order_id': data['id']})

@app.route('/api/contact', methods=['POST'])
def api_contact():
    data = request.get_json()
    contacts = load_json_file(CONTACTS_FILE)
    data['timestamp'] = time.time()
    contacts.append(data)
    save_json_file(CONTACTS_FILE, contacts)
    return jsonify({'success': True})

def save_farmer():
    data = request.get_json()
    # Example fields: name, phone, address, etc.
    name = data.get('name')
    phone = data.get('phone')
    address = data.get('address')
    if not name or not phone:
        return jsonify({'success': False, 'message': 'Name and phone are required'}), 400
    save_farmer_data({'name': name, 'phone': phone, 'address': address})
    return jsonify({'success': True, 'message': 'Farmer data saved successfully'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)


