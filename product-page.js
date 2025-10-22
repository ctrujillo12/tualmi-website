/* product-page.js
   Handles:
   - color swatch image switching
   - thumbnail clicks
   - size selection (required before add-to-cart)
   - add-to-cart with cart storage
   - product tabs
   
   NOTE: This file requires cart-manager.js to be loaded first
*/

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const mainImage = document.getElementById('mainImage');
  const colorSwatches = document.querySelectorAll('.color-swatch');
  const thumbs = document.querySelectorAll('.thumb');
  const sizeBtns = document.querySelectorAll('.size-btn');
  const addToCartBtn = document.getElementById('addToCartBtn');
  const miniCart = document.getElementById('miniCart');
  const qtySelect = document.getElementById('qty');

  let selectedSize = null;
  let selectedColor = null;
  let selectedColorImage = null;

  // color swatch logic
  colorSwatches.forEach(s => {
    s.addEventListener('click', (e) => {
      colorSwatches.forEach(x => x.classList.remove('active'));
      s.classList.add('active');
      
      const img = s.dataset.image;
      if (img) mainImage.src = img;
      
      // Store selected color info
      selectedColor = s.getAttribute('title') || 'Default';
      selectedColorImage = img;
    });
  });

  // Initialize first color as selected
  if (colorSwatches.length > 0) {
    const firstSwatch = colorSwatches[0];
    selectedColor = firstSwatch.getAttribute('title') || 'Default';
    selectedColorImage = firstSwatch.dataset.image;
  }

  // thumbs (small images)
  thumbs.forEach(t => {
    t.addEventListener('click', () => {
      const img = t.dataset.image;
      if (img) mainImage.src = img;
    });
  });

  // size selection
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.dataset.size;
    });
  });

  // add to cart button
  addToCartBtn.addEventListener('click', () => {
    // require size selection
    if (!selectedSize) {
      flashSelect();
      return;
    }

    const productName = document.querySelector('.product-title').textContent.trim();
    const priceText = document.querySelector('.product-price-large').textContent.trim();
    const priceValue = parseFloat(priceText.replace('$', ''));
    const quantity = parseInt(qtySelect.value);

    // Create cart item
    const cartItem = {
      id: productName.toLowerCase().replace(/\s+/g, '-'),
      name: productName,
      price: priceValue,
      quantity: quantity,
      size: selectedSize,
      color: selectedColor || 'Default',
      image: selectedColorImage || mainImage.src
    };

    // Add to cart using global CartManager (from cart-manager.js)
    if (window.CartManager) {
      window.CartManager.add(cartItem);
    } else {
      console.error('CartManager not found. Make sure cart-manager.js is loaded.');
      alert('Error adding to cart. Please refresh the page and try again.');
      return;
    }

    // Show confirmation
    showMiniCart(cartItem);

    // Visual feedback on button
    const originalText = addToCartBtn.textContent;
    addToCartBtn.textContent = 'Added!';
    addToCartBtn.style.background = '#5a6650';
    
    setTimeout(() => {
      addToCartBtn.textContent = originalText;
      addToCartBtn.style.background = '';
    }, 2000);
  });

  function flashSelect() {
    // briefly pulse the size buttons container
    const sizeGrid = document.querySelector('.size-grid');
    if (sizeGrid) {
      sizeGrid.style.boxShadow = '0 0 0 4px rgba(212,165,165,0.12)';
      sizeGrid.style.transition = 'box-shadow 0.3s ease';
      setTimeout(() => {
        sizeGrid.style.boxShadow = 'none';
      }, 900);
    }
  }

  function showMiniCart(product) {
    if (miniCart) {
      miniCart.hidden = false;
      const miniText = miniCart.querySelector('.mini-text');
      if (miniText) {
        miniText.textContent = `${product.name} added to cart`;
      }
      
      // hide after 3s
      setTimeout(() => {
        miniCart.hidden = true;
      }, 3000);
    }
  }

  // Tabs
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const id = t.dataset.tab;
      panels.forEach(p => p.classList.toggle('active', p.id === id));
      
      // small scroll if mobile
      const panel = document.getElementById(id);
      if (panel && window.innerWidth < 768) {
        panel.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });

  // Make sure the first panel is visible
  const firstTab = document.querySelector('.tab.active');
  if (!firstTab && tabs.length > 0) {
    tabs[0].click();
  }
});