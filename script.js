// script.js में सबसे ऊपर जोड़ें
const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// small JS to enable sticky header shadow & simple interactivity
document.addEventListener('scroll', function(){
  const header = document.querySelector('.site-header');
  if(window.scrollY > 20){
    header.style.boxShadow = '0 6px 22px rgba(0,0,0,0.12)';
    header.style.backdropFilter = 'blur(4px)';
    header.style.background = 'rgba(255,255,255,0.92)';
  } else {
    header.style.boxShadow = 'none';
    header.style.background = 'transparent';
  }
});

// REMOVE OLD CHATBOT WIDGET CODE
// Delete or comment out the entire block starting from:
// document.addEventListener('DOMContentLoaded', function(){ ... });
// that creates the FAQ-style chatbot or any chatbot widget except n8n.

// If you only want n8n chatbot via HTML (recommended), just remove this JS chatbot code completely.

// Helpline Popup logic for "Chat & Quote" button
function injectHelplinePopup() {
  if (document.getElementById('helpline-popup')) return; // Prevent duplicate
  const popup = document.createElement('div');
  popup.id = 'helpline-popup';
  popup.style = 'display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.18);z-index:9999;';
  popup.innerHTML = `
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:32px 24px 24px 24px;border-radius:16px;box-shadow:0 8px 32px rgba(44,62,80,0.18);min-width:280px;text-align:center;">
      <h3 style="margin-bottom:12px;color:#2f7a4d;">Helpline Number</h3>
      <div style="font-size:1.4rem;font-weight:700;margin-bottom:18px;" id="helpline-number">+91 8871368782</div>
      <a href="tel:+918871368782" class="btn" style="background:#2f7a4d;color:#fff;margin-bottom:10px;display:inline-block;padding:10px 24px;border-radius:8px;text-decoration:none;">📞 Call Now</a>
      <button id="copy-helpline-btn" class="btn" style="background:#e0f7fa;color:#2f7a4d;margin-left:8px;padding:10px 24px;border-radius:8px;border:none;font-weight:600;cursor:pointer;">📋 Copy</button>
      <br>
      <button id="close-helpline-btn" style="margin-top:18px;background:#eee;color:#333;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;">Close</button>
      <div id="copy-msg" style="margin-top:8px;color:#388e3c;font-size:1rem;"></div>
    </div>
  `;
  document.body.appendChild(popup);

  // Button event listeners
  popup.querySelector('#copy-helpline-btn').onclick = function() {
    const num = popup.querySelector('#helpline-number').textContent;
    navigator.clipboard.writeText(num);
    popup.querySelector('#copy-msg').textContent = 'Number copied!';
  };
  popup.querySelector('#close-helpline-btn').onclick = function() {
    popup.style.display = 'none';
  };
}

document.addEventListener('DOMContentLoaded', function() {
  injectHelplinePopup();
  const btn = document.getElementById('helpline-btn');
  if (btn) {
    btn.onclick = function() {
      document.getElementById('helpline-popup').style.display = 'block';
      document.getElementById('copy-msg').textContent = '';
    };
  }
});

// ---------------- 3D Character with speech ----------------
function ensure3DCharacter(root){
  if(root.querySelector('#cb-3d')) return;
  // wrapper beside chat
  var wrap = document.createElement('div');
  wrap.id = 'cb-3d';
  wrap.style = 'position:absolute; left:-340px; bottom:0; width:300px; height:360px; pointer-events:none;';
  wrap.innerHTML = ''+
    '<div style="position:absolute; left:0; bottom:0; width:300px; height:300px; overflow:hidden; border-radius:14px; box-shadow:0 10px 24px rgba(0,0,0,.18); background:#f6faf7">'
    +  '<div id="cb-3d-fallback" style="width:300px;height:300px"></div>'
    +'</div>'
    +'<div id="cb-3d-bubble" style="position:absolute; left:20px; bottom:310px; background:#fff; color:#111; padding:8px 10px; border-radius:10px; box-shadow:0 6px 22px rgba(0,0,0,.15); font-weight:700; display:none; max-width:260px;"></div>';
  root.appendChild(wrap);

  // try model-viewer; fallback to canvas avatar
  loadModelViewer().then(function(){
    var host = root.querySelector('#cb-3d-fallback');
    if(!host) return;
    host.innerHTML = '<model-viewer src="https://modelviewer.dev/shared-assets/models/Astronaut.glb" autoplay auto-rotate rotation-per-second="20deg" camera-controls disable-zoom style="width:300px;height:300px;pointer-events:none;" exposure="0.9" shadow-intensity="0.2"></model-viewer>';
  }).catch(function(){
    var host = root.querySelector('#cb-3d-fallback');
    if(!host) return;
    host.innerHTML = '<canvas id="cb-3d-canvas" width="300" height="300" style="width:300px;height:300px"></canvas>';
    drawSmilingAvatarCanvas();
  });
}

function loadModelViewer(){
  return new Promise(function(resolve, reject){
    if(window.customElements && customElements.get && customElements.get('model-viewer')){ return resolve(); }
    var s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    s.onload = function(){ resolve(); };
    s.onerror = function(){ reject(new Error('model-viewer load failed')); };
    document.head.appendChild(s);
    // also add nomodule for older browsers (best-effort)
    var s2 = document.createElement('script');
    s2.noModule = true; s2.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer-legacy.js';
    document.head.appendChild(s2);
  });
}

function drawSmilingAvatarCanvas(){
  var c = document.getElementById('cb-3d-canvas'); if(!c) return;
  var ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  var cx=150, cy=170, r=90;
  var grad = ctx.createRadialGradient(cx-30, cy-30, 40, cx, cy, r);
  grad.addColorStop(0,'#e7f3ec'); grad.addColorStop(1,'#9fc9b2');
  ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#133f28';
  ctx.beginPath(); ctx.arc(cx-30, cy-10, 7, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+30, cy-10, 7, 0, Math.PI*2); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle='#133f28';
  ctx.beginPath(); ctx.arc(cx, cy+10, 38, 0.2*Math.PI, 0.8*Math.PI); ctx.stroke();
}

function speakInAvatar(root, text){
  var bubble = root.querySelector('#cb-3d-bubble');
  if(bubble){
    bubble.textContent = text;
    bubble.style.display = 'block';
    clearTimeout(speakInAvatar._t);
    speakInAvatar._t = setTimeout(function(){ bubble.style.display = 'none'; }, 6000);
  }
  trySpeak(text);
}

function trySpeak(text){
  if(!('speechSynthesis' in window)) return;
  var utter = new SpeechSynthesisUtterance(text);
  // Prefer Hindi if Devanagari present, else English India
  var hasHindiChars = /[\u0900-\u097F]/.test(text);
  utter.lang = hasHindiChars ? 'hi-IN' : 'en-IN';
  utter.rate = 1.0; utter.pitch = 1.0; utter.volume = 1.0;
  // Attempt to pick a matching voice if available
  var voices = speechSynthesis.getVoices();
  var preferred = voices.find(function(v){ return v.lang === utter.lang; }) || voices.find(function(v){ return v.lang.startsWith(utter.lang.split('-')[0]); });
  if(preferred) utter.voice = preferred;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ---------------- Backend AI ----------------
function askBackendAI(message){
  return fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message })
  }).then(function(r){
    if(!r.ok) throw new Error('bad');
    return r.json();
  }).then(function(j){
    if(j && j.answer) return j.answer;
    throw new Error('no answer');
  });
}

// ---------------- CART ----------------
function initializeAddToCart(){
  attachCartHandlers();
  // In case of dynamic content in future, we can re-run this after DOM changes
}

function attachCartHandlers(){
  var buttons = document.querySelectorAll('.product-card .btn');
  Array.prototype.forEach.call(buttons, function(btn){
    var label = (btn.textContent || '').toLowerCase();
    if(label.indexOf('add to cart') !== -1){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        var card = btn.closest('.product-card');
        if(!card) return;
        var nameEl = card.querySelector('h4');
        var priceEl = card.querySelector('.price');
        var imgEl = card.querySelector('img');
        var name = nameEl ? nameEl.textContent.trim() : 'Product';
        var priceText = priceEl ? priceEl.textContent.trim() : '0';
        var image = imgEl ? imgEl.getAttribute('src') : '';
        var price = parsePriceToNumber(priceText);
        addItemToCart({ name: name, price: price, image: image, qty: 1 });
        temporaryButtonState(btn, 'Added ✓');
        showNotice('Added to cart: ' + name);
      });
    }
  });
}

function parsePriceToNumber(text){
  // Extract digits from strings like "₹1200.00" or "₹40/kg"
  var m = (text || '').replace(/[,\s]/g,'').match(/([0-9]+(?:\.[0-9]+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function getCart(){
  try{ return JSON.parse(localStorage.getItem('cart') || '[]'); }catch(e){ return []; }
}

function saveCart(items){
  localStorage.setItem('cart', JSON.stringify(items));
}

function addItemToCart(item){
  var cart = getCart();
  var idx = cart.findIndex(function(x){ return x.name === item.name; });
  if(idx >= 0){ cart[idx].qty = (cart[idx].qty || 1) + (item.qty || 1); }
  else { cart.push(item); }
  saveCart(cart);
}

function temporaryButtonState(btn, text){
  var old = btn.textContent;
  btn.textContent = text;
  btn.disabled = true;
  setTimeout(function(){ btn.textContent = old; btn.disabled = false; }, 1200);
}

function showNotice(message){
  if(!document.getElementById('notice-styles')){
    var s = document.createElement('style');
    s.id = 'notice-styles';
    s.textContent = '\n'
      + '#notice{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#111;color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:10000;font-weight:700}';
    document.head.appendChild(s);
  }
  var el = document.getElementById('notice');
  if(!el){ el = document.createElement('div'); el.id = 'notice'; document.body.appendChild(el); }
  el.textContent = message;
  el.style.display = 'block';
  clearTimeout(showNotice._t);
  showNotice._t = setTimeout(function(){ el.style.display = 'none'; }, 1500);
}

// ---------- Site-wide interactions ----------
// Order Now handler used by cards in index.html
function orderNow(itemName){
  try{
    localStorage.setItem('order_draft', JSON.stringify({ product: itemName || 'Product' }));
  }catch(_){}
  window.location.href = 'orders-dashboard.html';
}

// Live weather and mandi rates
function initializeLiveData(){
  try{
    var wdBtn = document.getElementById('wd-fetch');
    var mdBtn = document.getElementById('md-fetch');
    if(wdBtn){
      wdBtn.addEventListener('click', function(){
        var city = (document.getElementById('wd-city').value||'').trim();
        if(!city){ showNotice('Enter city'); return; }
        fetch('/api/weather?city=' + encodeURIComponent(city)).then(function(r){ return r.json(); }).then(function(j){
          if(j.error){ document.getElementById('wd-result').textContent = 'Error: ' + (j.message||j.error); return; }
          document.getElementById('wd-result').textContent = (
            (j.city||city) + ': ' + j.temp_c + '°C, feels ' + j.feels_like_c + '°C, ' + j.weather + ', wind ' + j.wind_ms + ' m/s, humidity ' + j.humidity + '%'
          );
        }).catch(function(){ document.getElementById('wd-result').textContent = 'Failed to fetch.'; });
      });
    }
    if(mdBtn){
      mdBtn.addEventListener('click', function(){
        var qs = new URLSearchParams();
        var state = document.getElementById('md-state').value.trim(); if(state) qs.set('state', state);
        var district = document.getElementById('md-district').value.trim(); if(district) qs.set('district', district);
        var market = document.getElementById('md-market').value.trim(); if(market) qs.set('market', market);
        var commodity = document.getElementById('md-commodity').value.trim(); if(commodity) qs.set('commodity', commodity);
        fetch('/api/mandi?' + qs.toString()).then(function(r){ return r.json(); }).then(function(j){
          if(j.error){ document.getElementById('md-result').textContent = 'Error: ' + (j.message||j.error); return; }
          if(!j.results || !j.results.length){ document.getElementById('md-result').textContent = 'No records found.'; return; }
          var lines = j.results.slice(0,5).map(function(rec){
            return rec.commodity + ' @ ' + rec.market + ' (' + rec.district + '): modal ' + rec.modal_price + ' ' + (rec.unit_of_price||'Rs/Quintal') + ' on ' + rec.arrival_date;
          });
          document.getElementById('md-result').textContent = lines.join(' | ');
        }).catch(function(){ document.getElementById('md-result').textContent = 'Failed to fetch.'; });
      });
    }
  }catch(_){}
}

// Newsletter footer form
function initializeNewsletterForm(){
  try{
    var forms = document.querySelectorAll('footer form');
    Array.prototype.forEach.call(forms, function(f){
      f.addEventListener('submit', function(e){
        e.preventDefault();
        var email = (f.querySelector('input[type="email"]')||{}).value || '';
        showNotice('Subscribed: ' + email);
        try{ f.reset(); }catch(_){}
      });
    });
  }catch(_){}
}
// "View" buttons on dashboard cards
function initializeViewButtons(){
  var buttons = document.querySelectorAll('.product-card .btn');
  Array.prototype.forEach.call(buttons, function(btn){
    var label = (btn.textContent || '').toLowerCase();
    if(label === 'view'){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        var card = btn.closest('.product-card');
        var nameEl = card ? card.querySelector('h4') : null;
        var name = nameEl ? nameEl.textContent.trim() : 'Product';
        showNotice('Viewing: ' + name);
      });
    }
  });
}

// n8n chatbot widget (add at end of file)
import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';
createChat({
  webhookUrl: 'https://kshitij-garg123.app.n8n.cloud/webhook/8f522b8e-9282-42a5-bede-be9063ebe427/chat'
});
