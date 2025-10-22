// cart-manager.js - Global cart management with localStorage
// This file should be loaded on ALL pages (product pages, cart page, etc.)

(function() {
  const CART_STORAGE_KEY = 'tualmi_cart';

  // CartManager object
  const CartManager = {
    // Get all items from cart
    getAll: function() {
      try {
        const cartData = localStorage.getItem(CART_STORAGE_KEY);
        return cartData ? JSON.parse(cartData) : [];
      } catch (error) {
        console.error('Error reading cart:', error);
        return [];
      }
    },

    // Save cart to localStorage
    save: function(items) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        this.notifyUpdate();
      } catch (error) {
        console.error('Error saving cart:', error);
      }
    },

    // Add item to cart
    add: function(item) {
      const items = this.getAll();
      
      // Check if item already exists (same id, size, color)
      const existingIndex = items.findIndex(i => 
        i.id === item.id && 
        i.size === item.size && 
        i.color === item.color
      );

      if (existingIndex > -1) {
        // Item exists, increase quantity
        items[existingIndex].quantity += item.quantity || 1;
      } else {
        // New item, add to cart
        items.push({
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          color: item.color,
          size: item.size,
          quantity: item.quantity || 1
        });
      }

      this.save(items);
      return true;
    },

    // Remove item from cart
    remove: function(id, size, color) {
      const items = this.getAll();
      const filtered = items.filter(item => 
        !(item.id === id && item.size === size && item.color === color)
      );
      this.save(filtered);
    },

    // Update item quantity
    updateQuantity: function(id, size, color, newQuantity) {
      const items = this.getAll();
      const item = items.find(i => 
        i.id === id && i.size === size && i.color === color
      );

      if (item) {
        if (newQuantity <= 0) {
          this.remove(id, size, color);
        } else {
          item.quantity = newQuantity;
          this.save(items);
        }
      }
    },

    // Get cart total price
    getTotal: function() {
      const items = this.getAll();
      return items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
    },

    // Get total item count
    getCount: function() {
      const items = this.getAll();
      return items.reduce((count, item) => count + item.quantity, 0);
    },

    // Clear entire cart
    clear: function() {
      localStorage.removeItem(CART_STORAGE_KEY);
      this.notifyUpdate();
    },

    // Notify other scripts that cart was updated
    notifyUpdate: function() {
      window.dispatchEvent(new CustomEvent('cartUpdated', {
        detail: { count: this.getCount(), total: this.getTotal() }
      }));
    }
  };

  // Make CartManager globally available
  window.CartManager = CartManager;

  // Initialize - notify on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      CartManager.notifyUpdate();
    });
  } else {
    CartManager.notifyUpdate();
  }
})();