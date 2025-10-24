/* cart.js - Shopping cart page logic and Stripe checkout */

// Initialize Stripe (replace with your publishable key)
const stripe = Stripe('pk_live_51SJh4mIR1P5z5KD6LqYjKFY4uaaErSCwYiYF72BtvvnIP8aXYmkPKHrWrYtCDVloarLq7sssltaogHtTwhmcADA100EgPK0tw3');

document.addEventListener('DOMContentLoaded', () => {
  const cartItemsContainer = document.getElementById('cartItems');
  const emptyCart = document.getElementById('emptyCart');
  const cartContent = document.getElementById('cartContent');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const subtotalEl = document.getElementById('subtotal');
  const totalEl = document.getElementById('total');

  function renderCart() {
    // Get cart items from CartManager
    const items = window.CartManager ? window.CartManager.getAll() : [];
    
    console.log('Cart items:', items); // Debug log
    
    // Show empty state or cart content based on items
    if (items.length === 0) {
      emptyCart.hidden = false;
      emptyCart.style.display = 'flex';
      cartContent.style.display = 'none';
      return;
    }

    // Hide empty state and show cart content
    emptyCart.hidden = true;
    emptyCart.style.display = 'none';
    cartContent.style.display = 'grid';

    // Render cart items
    cartItemsContainer.innerHTML = items.map((item, index) => `
      <div class="cart-item" data-index="${index}">
        <img src="${item.image}" alt="${item.name}" class="item-image">
        
        <div class="item-details">
          <h3 class="item-name">${item.name}</h3>
          <div class="item-meta">
            <div class="item-meta-row">Color: ${item.color}</div>
            <div class="item-meta-row">Size: ${item.size}</div>
          </div>
        </div>
        
        <div class="item-actions">
          <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
          
          <div class="qty-controls">
            <button class="qty-btn qty-decrease" data-id="${item.id}" data-size="${item.size}" data-color="${item.color}">−</button>
            <span class="qty-display">${item.quantity}</span>
            <button class="qty-btn qty-increase" data-id="${item.id}" data-size="${item.size}" data-color="${item.color}">+</button>
          </div>
          
          <button class="remove-btn" data-id="${item.id}" data-size="${item.size}" data-color="${item.color}">Remove</button>
        </div>
      </div>
    `).join('');

    // Update totals
    const total = window.CartManager.getTotal();
    subtotalEl.textContent = `$${total.toFixed(2)}`;
    totalEl.textContent = `$${total.toFixed(2)}`;

    // Attach event listeners
    attachCartEventListeners();
  }

  function attachCartEventListeners() {
    // Quantity decrease
    document.querySelectorAll('.qty-decrease').forEach(btn => {
      btn.addEventListener('click', () => {
        const { id, size, color } = btn.dataset;
        const item = window.CartManager.getAll().find(i => i.id === id && i.size === size && i.color === color);
        if (item && item.quantity > 1) {
          window.CartManager.updateQuantity(id, size, color, item.quantity - 1);
          renderCart();
        }
      });
    });

    // Quantity increase
    document.querySelectorAll('.qty-increase').forEach(btn => {
      btn.addEventListener('click', () => {
        const { id, size, color } = btn.dataset;
        const item = window.CartManager.getAll().find(i => i.id === id && i.size === size && i.color === color);
        if (item) {
          window.CartManager.updateQuantity(id, size, color, item.quantity + 1);
          renderCart();
        }
      });
    });

    // Remove item
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const { id, size, color } = btn.dataset;
        if (confirm('Remove this item from your cart?')) {
          window.CartManager.remove(id, size, color);
          renderCart();
        }
      });
    });
  }

  // Checkout button
  checkoutBtn.addEventListener('click', async () => {
    const items = window.CartManager.getAll();
    console.log('🛒 Items being sent to Stripe:', items); 
    if (items.length === 0) {
      alert('Your cart is empty');
      return;
    }

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Processing...';

    try {
      // Send cart to your backend (running on port 3001)
      const API_URL = 'http://localhost:3001/api/create-checkout-session';
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            image: item.image
          }))
        })
      });

      const session = await response.json();

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id
      });

      if (result.error) {
        alert(result.error.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('There was an error processing your checkout. Please try again.');
    } finally {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'Proceed to Checkout';
    }
  });

  // Listen for cart updates
  window.addEventListener('cartUpdated', () => {
    renderCart();
  });

  // Initial render
  renderCart();
});