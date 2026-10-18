// KAILU CREATION — catalog products and WhatsApp order settings.
// IMPORTANT: Replace WHATSAPP_NUMBER with your number including country code,
// digits only. Example India: "919876543210" (no +, spaces, or hyphens).

const WHATSAPP_NUMBER = "918160621151"; // Optional WhatsApp fallback
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwD97xQD3dIEExZ02b3H6Nb5m1CIs6KyHI9EOL5jQTJgkK_RB17ym81WYpyeGWowrD9YQ/exec";
const CURRENCY = "INR";

const products = [
  {id:1,name:"Royal Blue Floral Suit",category:"Ethnic Suits",price:299,image:"images/catalog-1-1.png",gallery:["images/catalog-1-2.png","images/catalog-1-3.png","images/catalog-1-4.png"],video:"videos/catalog-1.mp4",tag:"CATALOG 01",description:"Blue floral ethnic suit with a statement dupatta.",color:"#e9dfd0"},
  {id:2,name:"Mustard Floral Suit",category:"Ethnic Suits",price:299,image:"images/catalog-2-1.jpg",gallery:["images/catalog-2-2.JPEG","images/catalog-2-3.JPEG","images/catalog-2-4.JPEG"],video:"videos/catalog-2.mp4",tag:"CATALOG 02",description:"Mustard floral suit with matching printed dupatta.",color:"#f0e4c9"},
  {id:3,name:"Sage Green Printed Suit",category:"Ethnic Suits",price:299,image:"images/catalog-3.jpg",gallery:["images/catalog-3-2.JPEG","images/catalog-3-3.JPEG","images/catalog-3-4.JPEG"],video:"videos/catalog-3.mp4",tag:"CATALOG 03",description:"Sage green and floral printed ethnic suit set.",color:"#e4e5d8"}
];

const $ = (selector) => document.querySelector(selector);
const productGrid = $("#productGrid");
const searchInput = $("#searchInput");
const categoryFilter = $("#categoryFilter");
const sortSelect = $("#sortSelect");
const cartDrawer = $("#cartDrawer");
const overlay = $("#overlay");
const cartItems = $("#cartItems");
const cartEmpty = $("#cartEmpty");
const cartBottom = $("#cartBottom");
const toast = $("#toast");
let cart = {};
let toastTimer;

const money = (amount) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: CURRENCY, maximumFractionDigits: 2
}).format(amount);

function renderCategories() {
  [...new Set(products.map(p => p.category))].sort().forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

function getVisibleProducts() {
  const query = searchInput.value.trim().toLowerCase();
  let visible = products.filter(p => {
    const matchesQuery = `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(query);
    const matchesCategory = categoryFilter.value === "all" || p.category === categoryFilter.value;
    return matchesQuery && matchesCategory;
  });
  if (sortSelect.value === "low") visible.sort((a,b) => a.price - b.price);
  if (sortSelect.value === "high") visible.sort((a,b) => b.price - a.price);
  if (sortSelect.value === "name") visible.sort((a,b) => a.name.localeCompare(b.name));
  return visible;
}

function renderProducts() {
  const visible = getVisibleProducts();
  productGrid.replaceChildren();
  $("#emptyProducts").hidden = visible.length !== 0;
  $("#productSummary").textContent = `${visible.length} product${visible.length === 1 ? "" : "s"} to explore`;
  visible.forEach(product => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-image" style="background:${product.color}">
        ${product.tag ? `<span class="product-tag">${escapeHtml(product.tag)}</span>` : ""}
        <img class="catalog-photo" src="${product.image}" alt="${escapeHtml(product.name)}">
        <button class="gallery-next" type="button" aria-label="Next photo" data-gallery-next="${product.id}" hidden>›</button>
      </div>
      <div class="product-gallery" data-gallery="${product.id}">
        <div class="gallery-thumbnails" aria-label="Product photos">
          <button type="button" class="gallery-thumb active" data-gallery-photo="${product.id}" data-src="${product.image}" aria-label="Main photo">
            <img src="${product.image}" alt="">
          </button>
          ${(product.gallery || []).map((src, index) => `
            <button type="button" class="gallery-thumb" data-gallery-photo="${product.id}" data-src="${src}" aria-label="Product photo ${index + 2}">
              <img src="${src}" alt="">
            </button>`).join("")}
        </div>
        <div class="product-video" data-video-box="${product.id}" hidden>
          <video controls preload="metadata" playsinline aria-label="${escapeHtml(product.name)} product video"></video>
        </div>
        <button class="video-toggle" type="button" data-video-toggle="${product.id}" hidden>▶ Watch product video</button>
      </div>
      <div class="product-info">
        <span class="product-category">${escapeHtml(product.category)}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <p class="product-description">${escapeHtml(product.description)}</p>
        <div class="product-buy"><span class="price">${money(product.price)} <small>/ item</small></span>
          <div class="product-actions">
            <button class="add-button" type="button" data-add="${product.id}">＋ Add to cart</button>
            <button class="buy-now-button" type="button" data-buy="${product.id}">Buy Now</button>
          </div>
        </div>
      </div>`;
    productGrid.appendChild(card);

    // Optional local media: missing optional photos/video are hidden gracefully.
    card.querySelectorAll(".gallery-thumb").forEach(thumb => {
      const image = thumb.querySelector("img");
      image.addEventListener("error", () => {
        if (thumb.dataset.src !== product.image) thumb.remove();
        updateGalleryControls(card, product);
      });
      image.addEventListener("load", () => updateGalleryControls(card, product));
    });
    const video = card.querySelector("video");
    const videoToggle = card.querySelector("[data-video-toggle]");
    const videoBox = card.querySelector("[data-video-box]");
    video.src = product.video;
    video.addEventListener("error", () => {
      videoBox.hidden = true;
      videoToggle.hidden = true;
    });
    video.addEventListener("loadedmetadata", () => {
      videoToggle.hidden = false;
      updateGalleryControls(card, product);
    });
    video.addEventListener("canplay", () => {
      videoToggle.hidden = false;
      updateGalleryControls(card, product);
    });
    updateGalleryControls(card, product);
  });
}

function updateGalleryControls(card, product) {
  const thumbs = [...card.querySelectorAll(".gallery-thumb")];
  const next = card.querySelector("[data-gallery-next]");
  const availableExtra = thumbs.filter(t => t.dataset.src !== product.image);
  next.hidden = availableExtra.length === 0;
  const gallery = card.querySelector(".product-gallery");
  gallery.hidden = availableExtra.length === 0 && card.querySelector("[data-video-toggle]").hidden;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[char]));
}

function addToCart(id) {
  const product = products.find(item => item.id === Number(id));
  if (!product) {
    showToast("This catalog could not be added. Please refresh the page.");
    return;
  }
  cart[id] = (cart[id] || 0) + 1;
  renderCart();
  openCart();
  startSizeStep();
  showToast(`${product.name} added to your cart. Select a clothing size.`);
}

function buyNow(id) {
  // Buy Now starts checkout with the selected catalog only.
  cart = { [id]: 1 };
  renderCart();
  openCart();
  startSizeStep();
  showToast("Select a clothing size first.");
}

function startSizeStep() {
  const checkoutFields = $("#checkoutFields");
  const deliveryFields = $("#deliveryFields");
  const proceedButton = $("#proceedCheckout");
  if (checkoutFields) {
    checkoutFields.hidden = false;
    checkoutFields.dataset.opened = "true";
  }
  if (deliveryFields) deliveryFields.hidden = true;
  if (proceedButton) proceedButton.hidden = true;
  clearValidationHighlights();
  const sizeSection = $("#sizeOptions");
  if (sizeSection) sizeSection.scrollIntoView({behavior:"smooth", block:"center"});
}

function clearValidationHighlights() {
  document.querySelectorAll(".field-invalid, .size-invalid").forEach(el => el.classList.remove("field-invalid", "size-invalid"));
}

function highlightMissingFields() {
  clearValidationHighlights();
  const missing = [];
  if (!$("#productSize").value) {
    $("#closePhotoLightbox").addEventListener("click", () => {
  $("#photoLightbox").hidden = true;
  document.body.classList.remove("photo-viewer-open");
});
$("#photoLightbox").addEventListener("click", event => {
  if (event.target.id === "photoLightbox") {
    $("#photoLightbox").hidden = true;
    document.body.classList.remove("photo-viewer-open");
  }
});
$("#photoLightboxPrev").addEventListener("click", () => moveLightboxPhoto(-1));
$("#photoLightboxNext").addEventListener("click", () => moveLightboxPhoto(1));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("#photoLightbox").hidden) {
    $("#photoLightbox").hidden = true;
    document.body.classList.remove("photo-viewer-open");
  }
  if (!$("#photoLightbox").hidden && event.key === "ArrowRight") moveLightboxPhoto(1);
  if (!$("#photoLightbox").hidden && event.key === "ArrowLeft") moveLightboxPhoto(-1);
});

const sizeOptions = $("#sizeOptions");
    if (sizeOptions) sizeOptions.classList.add("size-invalid");
    missing.push(sizeOptions);
  }
  ["customerName", "houseBuilding", "roadArea", "pincode", "city", "state"].forEach(id => {
    const field = $("#" + id);
    if (field && !field.value.trim()) {
      field.classList.add("field-invalid");
      missing.push(field);
    }
  });
  if ($("#pincode").value.trim() && !/^[0-9]{6}$/.test($("#pincode").value.trim())) {
    $("#pincode").classList.add("field-invalid");
    missing.push($("#pincode"));
  }
  const first = missing.find(Boolean);
  if (first) first.scrollIntoView({behavior:"smooth", block:"center"});
  return missing;
}

function changeQuantity(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  renderCart();
}

function removeFromCart(id) {
  delete cart[id];
  renderCart();
}

function getCartEntries() {
  return Object.entries(cart).map(([id, quantity]) => ({
    product: products.find(p => p.id === Number(id)), quantity
  })).filter(item => item.product);
}

function renderCart() {
  const entries = getCartEntries();
  const count = entries.reduce((sum, item) => sum + item.quantity, 0);
  const total = entries.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  $("#cartCount").textContent = count;
  $("#drawerCount").textContent = `(${count})`;
  $("#cartTotal").textContent = money(total);

  // Rebuild and explicitly show the product list so cart contents never appear blank.
  cartItems.replaceChildren();
  cartItems.hidden = count === 0;
  cartEmpty.hidden = count > 0;
  cartBottom.hidden = count === 0;
  cartItems.style.display = count > 0 ? "block" : "";
  const checkoutFields = $("#checkoutFields");
  const proceedButton = $("#proceedCheckout");
  if (count === 0) {
    if (checkoutFields) checkoutFields.hidden = true;
    if (proceedButton) proceedButton.hidden = true;
  } else if (checkoutFields && checkoutFields.dataset.opened !== "true") {
    checkoutFields.hidden = true;
    if (proceedButton) proceedButton.hidden = false;
  }

  entries.forEach(({product, quantity}) => {
    const row = document.createElement("div");
    row.className = "cart-line";
    row.innerHTML = `
      <div class="cart-thumb"><img src="${product.image}" alt="${escapeHtml(product.name)}"></div>
      <div class="cart-product-details">
        <h4>${escapeHtml(product.name)}</h4>
        <div class="unit-price">${money(product.price)} / item</div>
        <div class="quantity-controls">
          <button type="button" data-minus="${product.id}" aria-label="Decrease ${escapeHtml(product.name)} quantity">−</button>
          <span>${quantity}</span>
          <button type="button" data-plus="${product.id}" aria-label="Increase ${escapeHtml(product.name)} quantity">＋</button>
          <button type="button" class="remove-button" data-remove="${product.id}">Remove</button>
        </div>
      </div>
      <div class="line-price">${money(product.price * quantity)}</div>`;
    cartItems.appendChild(row);
  });
}

function openCart() {
  cartDrawer.hidden = false;
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  $("#closeCart").focus();
}
function closeCart() {
  cartDrawer.hidden = true;
  overlay.hidden = true;
  document.body.style.overflow = "";
  $("#cartShortcut").focus();
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2100);
}

async function sendWhatsAppOrder() {
  const deliveryFields = $("#deliveryFields");
  if (deliveryFields) deliveryFields.hidden = false;
  const missingFields = highlightMissingFields();
  if (missingFields.length) {
    showToast("Please complete the highlighted fields.");
    return;
  }
  const entries = getCartEntries();
  if (!entries.length) {
    showToast("Please add a product first");
    return;
  }
  const size = $("#productSize").value;
  const name = $("#customerName").value.trim();
  const houseBuilding = $("#houseBuilding").value.trim();
  const roadArea = $("#roadArea").value.trim();
  const pincode = $("#pincode").value.trim();
  const city = $("#city").value.trim();
  const state = $("#state").value.trim();
  const fields = [
    ["productSize", size], ["customerName", name], ["houseBuilding", houseBuilding],
    ["roadArea", roadArea], ["pincode", pincode], ["city", city], ["state", state]
  ];
  const missing = fields.find(([, value]) => !value);
  if (missing) {
    $("#" + missing[0]).focus();
    showToast("Please complete all required fields");
    return;
  }
  if (!/^[0-9]{6}$/.test(pincode)) {
    $("#pincode").focus();
    showToast("Please enter a valid 6-digit PIN code");
    return;
  }
  if (!GOOGLE_SCRIPT_URL.startsWith("https://script.google.com/macros/s/")) {
    showToast("Setup needed: add your Google Script URL in script.js");
    return;
  }

  const total = entries.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const orderItems = entries.map(({product, quantity}) => ({
    productName: product.name,
    productId: product.id,
    size,
    quantity,
    unitPrice: product.price,
    lineTotal: product.price * quantity
  }));
  const payload = new URLSearchParams({
    store: "KAILU CREATION",
    customerName: name,
    size,
    houseBuilding,
    roadArea,
    pincode,
    city,
    state,
    paymentMethod: "Cash on Delivery (COD)",
    currency: "INR",
    total: String(total),
    items: JSON.stringify(orderItems)
  });

  const submitButton = $("#whatsappOrder");
  const originalText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.textContent = "Submitting order…";
  try {
    // Apps Script is cross-origin; no-cors allows a simple form POST.
    // The browser cannot read the response, so verify a test order in Sheets/email.
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: payload
    });
    showToast("Order request sent. Check your email/Google Sheet shortly.");
    submitButton.textContent = "Order Request Sent";

    // Return the customer to the catalog and close the cart after submission.
    cart = {};
    renderCart();
    closeCart();
    $("#productSize").value = "";
    document.querySelectorAll("#sizeOptions .size-button").forEach(option => {
      option.classList.remove("selected");
      option.setAttribute("aria-pressed", "false");
    });
    ["customerName", "houseBuilding", "roadArea", "pincode", "city", "state"].forEach(id => {
      const field = $("#" + id);
      if (field) field.value = "";
    });
    $("#products").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showToast("Could not send order. Check internet and try again.");
    submitButton.innerHTML = originalText;
    submitButton.disabled = false;
    return;
  }
  setTimeout(() => {
    submitButton.innerHTML = originalText;
    submitButton.disabled = false;
  }, 3500);
}

let lightboxPhotos = [];
let lightboxIndex = 0;

function openPhotoLightbox(card, clickedSrc) {
  const img = $("#photoLightboxImage");
  lightboxPhotos = [...card.querySelectorAll(".gallery-thumb")]
    .map(button => button.dataset.src)
    .filter(Boolean);
  if (!lightboxPhotos.length) lightboxPhotos = [clickedSrc];
  lightboxIndex = Math.max(0, lightboxPhotos.indexOf(clickedSrc));
  img.src = lightboxPhotos[lightboxIndex] || clickedSrc;
  $("#photoLightbox").hidden = false;
  document.body.classList.add("photo-viewer-open");
}

function moveLightboxPhoto(delta) {
  if (!lightboxPhotos.length) return;
  lightboxIndex = (lightboxIndex + delta + lightboxPhotos.length) % lightboxPhotos.length;
  $("#photoLightboxImage").src = lightboxPhotos[lightboxIndex];
}

productGrid.addEventListener("click", event => {
  const clickedPhoto = event.target.closest(".catalog-photo");
  if (clickedPhoto) {
    openPhotoLightbox(clickedPhoto.closest(".product-card"), clickedPhoto.src);
    return;
  }
  const photoButton = event.target.closest("[data-gallery-photo]");
  const nextButton = event.target.closest("[data-gallery-next]");
  const videoButton = event.target.closest("[data-video-toggle]");

  if (photoButton) {
    const card = photoButton.closest(".product-card");
    const main = card.querySelector(".catalog-photo");
    main.src = photoButton.dataset.src;
    card.querySelectorAll(".gallery-thumb").forEach(t => t.classList.toggle("active", t === photoButton));
  }
  if (nextButton) {
    const card = nextButton.closest(".product-card");
    const thumbs = [...card.querySelectorAll(".gallery-thumb")];
    const current = Math.max(0, thumbs.findIndex(t => t.classList.contains("active")));
    const next = thumbs[(current + 1) % thumbs.length];
    if (next) next.click();
  }
  if (videoButton) {
    const card = videoButton.closest(".product-card");
    const videoBox = card.querySelector("[data-video-box]");
    const video = videoBox.querySelector("video");
    videoBox.hidden = !videoBox.hidden;
    if (!videoBox.hidden) {
      video.play().catch(() => {});
      videoBox.scrollIntoView({behavior:"smooth", block:"nearest"});
    } else {
      video.pause();
    }
  }
});

productGrid.addEventListener("click", event => {
  const target = event.target instanceof Element ? event.target : event.target.parentElement;
  const addButton = target && target.closest("[data-add]");
  const buyButton = target && target.closest("[data-buy]");
  if (addButton) {
    event.preventDefault();
    addToCart(Number(addButton.dataset.add));
    return;
  }
  if (buyButton) {
    event.preventDefault();
    buyNow(Number(buyButton.dataset.buy));
  }
});
$("#closePhotoLightbox").addEventListener("click", () => {
  $("#photoLightbox").hidden = true;
  document.body.classList.remove("photo-viewer-open");
});
$("#photoLightbox").addEventListener("click", event => {
  if (event.target.id === "photoLightbox") {
    $("#photoLightbox").hidden = true;
    document.body.classList.remove("photo-viewer-open");
  }
});
$("#photoLightboxPrev").addEventListener("click", () => moveLightboxPhoto(-1));
$("#photoLightboxNext").addEventListener("click", () => moveLightboxPhoto(1));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("#photoLightbox").hidden) {
    $("#photoLightbox").hidden = true;
    document.body.classList.remove("photo-viewer-open");
  }
  if (!$("#photoLightbox").hidden && event.key === "ArrowRight") moveLightboxPhoto(1);
  if (!$("#photoLightbox").hidden && event.key === "ArrowLeft") moveLightboxPhoto(-1);
});

document.querySelectorAll(".customer-input").forEach(field => {
  field.addEventListener("input", () => field.classList.remove("field-invalid"));
});
const sizeOptions = $("#sizeOptions");
if (sizeOptions) {
  sizeOptions.addEventListener("click", event => {
    const button = event.target.closest("[data-size]");
    if (!button) return;
    $("#productSize").value = button.dataset.size;
    $("#sizeOptions").classList.remove("size-invalid");
    document.querySelectorAll("#sizeOptions .size-button").forEach(option => {
      const selected = option === button;
      option.classList.toggle("selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
  });
}

const continueToDetails = $("#continueToDetails");
if (continueToDetails) {
  continueToDetails.addEventListener("click", () => {
    clearValidationHighlights();
    if (!$("#productSize").value) {
      $("#sizeOptions").classList.add("size-invalid");
      $("#sizeOptions").scrollIntoView({behavior:"smooth", block:"center"});
      showToast("Please select a clothing size first.");
      return;
    }
    $("#sizeOptions").classList.remove("size-invalid");
    $("#deliveryFields").hidden = false;
    $("#deliveryFields").scrollIntoView({behavior:"smooth", block:"start"});
    const firstField = $("#customerName");
    if (firstField) firstField.focus({preventScroll:true});
  });
}

cartItems.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.minus) changeQuantity(Number(button.dataset.minus), -1);
  if (button.dataset.plus) changeQuantity(Number(button.dataset.plus), 1);
  if (button.dataset.remove) removeFromCart(Number(button.dataset.remove));
});
searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);
sortSelect.addEventListener("change", renderProducts);
$("#cartShortcut").addEventListener("click", () => {
  renderCart();
  openCart();
});
const proceedCheckout = $("#proceedCheckout");
if (proceedCheckout) {
  proceedCheckout.addEventListener("click", () => {
    const checkoutFields = $("#checkoutFields");
    checkoutFields.hidden = false;
    checkoutFields.dataset.opened = "true";
    proceedCheckout.hidden = true;
    checkoutFields.scrollIntoView({behavior: "smooth", block: "start"});
  });
}
$("#closeCart").addEventListener("click", closeCart);
$("#continueShopping").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
$("#whatsappOrder").addEventListener("click", sendWhatsAppOrder);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !cartDrawer.hidden) closeCart();
});

renderCategories();
renderProducts();
renderCart();
