(() => {
  "use strict";

  const config = window.MTNAIDU_CONFIG || {};
  const searchInput = document.querySelector("#catalogue-search");
  const categorySelect = document.querySelector("#catalogue-category");
  const statusElement = document.querySelector("#catalogue-status");
  const productGrid = document.querySelector("#product-grid");
  const emptyState = document.querySelector("#catalogue-empty");
  const requestItems = document.querySelector("#request-items");
  const requestCount = document.querySelector("#request-count");
  const orderForm = document.querySelector("#order-form");
  const orderButton = document.querySelector("#order-submit");
  const orderResult = document.querySelector("#order-result");
  const whatsappFollowup = document.querySelector("#whatsapp-followup");
  const categoryCards = [...document.querySelectorAll("[data-product-group]")];
  const products = [];
  const cart = new Map();
  let catalogueState = "loading";
  let catalogueError = "";
  let isSendingOrder = false;
  let selectedProductGroup = "";

  const english = {
    loading: "Loading the product catalogue…",
    connected: () => "Browse our products below or choose a category.",
    unconfigured: "The online catalogue is being set up. Contact us to ask about a product.",
    failed: "We couldn’t load the products. Please refresh the list or contact the shop.",
    empty: "We don’t have a matching listed item yet.",
    searchEmpty: "No listed products match your search.",
    ask: "Ask about this item",
    category: "All categories",
    priceUnknown: "Ask us for the price",
    add: "Add to request",
    added: "Added",
    itemCount: (count) => `${count} item${count === 1 ? "" : "s"}`,
    emptyCart: "Add items from the product list above to start a request.",
    requestSaved: (id) => `Request saved. Reference: ${id}. We’ll contact you to confirm the stock, price and pickup.`,
    sending: "Sending your request…",
    noProducts: "Add a listed product to your request before sending.",
    orderFailed: "We couldn’t save your request. Your order has not been sent. Please try again or contact the shop."
  };
  const telugu = {
    loading: "ఉత్పత్తుల జాబితాను లోడ్ చేస్తున్నాము…",
    connected: () => "క్రింద ఉన్న ఉత్పత్తులను చూడండి లేదా ఒక వర్గాన్ని ఎంచుకోండి.",
    unconfigured: "ఆన్‌లైన్ ఉత్పత్తుల జాబితా సిద్ధమవుతోంది. ఉత్పత్తి గురించి అడగడానికి మమ్మల్ని సంప్రదించండి.",
    failed: "ఉత్పత్తులను లోడ్ చేయలేకపోయాము. మళ్లీ ప్రయత్నించండి లేదా షాప్‌ను సంప్రదించండి.",
    empty: "ఈ ఉత్పత్తి ప్రస్తుతం జాబితాలో లేదు.",
    searchEmpty: "మీ వెతుకులాటకు సరిపోయే ఉత్పత్తులు లేవు.",
    ask: "ఈ ఉత్పత్తి గురించి అడగండి",
    category: "అన్ని వర్గాలు",
    priceUnknown: "ధర కోసం అడగండి",
    add: "అభ్యర్థనకు జోడించండి",
    added: "జోడించబడింది",
    itemCount: (count) => `${count} ఉత్పత్తులు`,
    emptyCart: "అభ్యర్థన ప్రారంభించడానికి పైనున్న జాబితా నుండి ఉత్పత్తులను జోడించండి.",
    requestSaved: (id) => `అభ్యర్థన సేవ్ అయింది. నంబర్: ${id}. స్టాక్, ధర మరియు పికప్‌ను నిర్ధారించడానికి మిమ్మల్ని సంప్రదిస్తాము.`,
    sending: "మీ అభ్యర్థనను పంపుతున్నాము…",
    noProducts: "పంపే ముందు మీ అభ్యర్థనలో ఉత్పత్తులను జోడించండి.",
    orderFailed: "మీ అభ్యర్థనను సేవ్ చేయలేకపోయాము. ఆర్డర్ పంపబడలేదు. మళ్లీ ప్రయత్నించండి లేదా షాప్‌ను సంప్రదించండి."
  };

  function strings() {
    return document.documentElement.lang === "te" ? telugu : english;
  }

  function isConfigured() {
    return typeof config.supabaseUrl === "string"
      && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.supabaseUrl.trim())
      && typeof config.supabasePublishableKey === "string"
      && config.supabasePublishableKey.trim().length > 20;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function apiUrl(path) {
    return `${config.supabaseUrl.replace(/\/+$/, "")}${path}`;
  }

  async function readError(response) {
    const body = await response.text();
    try {
      const error = JSON.parse(body);
      return error.message || error.msg || error.error_description || body;
    } catch {
      return body;
    }
  }

  function publicHeaders() {
    return {
      apikey: config.supabasePublishableKey,
      Authorization: `Bearer ${config.supabasePublishableKey}`
    };
  }

  function productPhotoUrl(imagePath) {
    if (!imagePath) return "";
    const safePath = imagePath.split("/").map((part) => encodeURIComponent(part)).join("/");
    const bucket = encodeURIComponent(config.productImageBucket || "product-images");
    return `${config.supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/${safePath}`;
  }

  function updateContactLinks() {
    const number = String(config.whatsappNumber || "919573384280").replace(/\D/g, "");
    document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
      const search = document.querySelector("#catalogue-search").value.trim();
      const template = link.dataset.whatsappMessage || "Hello, I want to ask about a product.";
      const message = link.closest("#catalogue-empty") && search ? `${template}${search}` : template;
      link.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    });
  }

  function visibleProducts() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const category = categorySelect.value;
    return products.filter((product) => {
      const searchable = [product.name, product.brand, product.sku, product.category, product.vehicle_fit, product.description]
        .filter(Boolean).join(" ").toLocaleLowerCase();
      return (!query || searchable.includes(query))
        && (!category || product.category === category)
        && (!selectedProductGroup || productGroup(product) === selectedProductGroup);
    });
  }

  function productGroup(product) {
    const details = [product.name, product.brand, product.category, product.description]
      .filter(Boolean).join(" ").toLocaleLowerCase();
    if (/\bbatter(?:y|ies)\b/.test(details)) return "batteries";
    if (/\boil\b|\boils\b|lubricant/.test(details)) return "oils";
    if (/spare|parts|accessor/.test(details)) return "parts";
    return "";
  }

  function renderCategoryCards() {
    categoryCards.forEach((card) => {
      card.setAttribute("aria-pressed", String(card.dataset.productGroup === selectedProductGroup));
    });
  }

  function buildCategories() {
    const selected = categorySelect.value;
    const categories = [...new Set(products.map((product) => product.category).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right));
    categorySelect.replaceChildren();
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = strings().category;
    categorySelect.append(allOption);
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = categoryLabel(category);
      categorySelect.append(option);
    });
    categorySelect.value = categories.includes(selected) ? selected : "";
  }

  function categoryLabel(category) {
    if (document.documentElement.lang !== "te") return category;
    const translated = {
      "engine oil": "ఇంజిన్ ఆయిల్",
      "hydraulic oil": "హైడ్రాలిక్ ఆయిల్",
      "two-wheeler spare parts": "బైక్ విడిభాగాలు",
      "car spare parts": "కారు విడిభాగాలు",
      accessories: "యాక్సెసరీస్",
      other: "ఇతరాలు"
    };
    return translated[category.toLocaleLowerCase()] || category;
  }

  function setCatalogueStatus(message, error = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("error", error);
  }

  function renderProducts() {
    const copy = strings();
    const visible = visibleProducts();
    productGrid.innerHTML = visible.map((product) => {
      const stock = Math.max(0, Number(product.stock_quantity) || 0);
      const inStock = stock > 0;
      const photoUrl = productPhotoUrl(product.image_path);
      const photo = photoUrl
        ? `<img class="product-photo" src="${escapeHtml(photoUrl)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async"><span class="product-photo-fallback hidden" aria-hidden="true">SV</span>`
        : `<span class="product-photo-fallback" aria-hidden="true">${escapeHtml((product.name || "SV").slice(0, 2).toUpperCase())}</span>`;
      const price = product.price === null || product.price === undefined || product.price === ""
        ? copy.priceUnknown
        : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(product.price));
      const fit = [product.brand, product.vehicle_fit].filter(Boolean).join(" · ");
      const action = inStock
        ? `<button class="button product-add" type="button" data-product-id="${escapeHtml(product.id)}">${escapeHtml(copy.add)}</button>`
        : `<a class="product-ask" href="https://wa.me/${String(config.whatsappNumber || "919573384280").replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, is this item available? ${product.name}`)}" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.ask)}</a>`;
      return `<article class="product-card">
        <div class="product-photo-frame">${photo}</div>
        <div class="product-card-copy">
          <span class="product-category">${escapeHtml(product.category)}</span>
          <h3>${escapeHtml(product.name)}</h3>
          ${fit ? `<p class="product-fit">${escapeHtml(fit)}</p>` : ""}
          ${product.description ? `<p class="product-description">${escapeHtml(product.description)}</p>` : ""}
          <div class="product-card-footer"><strong>${escapeHtml(price)}</strong>
            ${action}
          </div>
        </div>
      </article>`;
    }).join("");

    productGrid.querySelectorAll(".product-photo").forEach((image) => {
      image.addEventListener("error", () => {
        image.classList.add("hidden");
        image.nextElementSibling?.classList.remove("hidden");
      }, { once: true });
    });
    productGrid.querySelectorAll("[data-product-id]").forEach((button) => {
      button.addEventListener("click", () => addToRequest(button.dataset.productId));
    });

    emptyState.classList.toggle("hidden", visible.length > 0);
    renderCategoryCards();
    if (catalogueState === "ready") {
      const query = searchInput.value.trim();
      emptyState.querySelector("strong").textContent = products.length === 0
        ? copy.empty
        : query || categorySelect.value ? copy.searchEmpty : copy.empty;
      setCatalogueStatus(copy.connected());
    }
    updateContactLinks();
  }

  function renderRequest() {
    const copy = strings();
    const itemCount = [...cart.values()].reduce((count, item) => count + item.quantity, 0);
    requestCount.textContent = copy.itemCount(itemCount);
    orderButton.disabled = itemCount === 0 || !isConfigured() || isSendingOrder;
    if (cart.size === 0) {
      requestItems.innerHTML = `<p class="request-empty">${escapeHtml(copy.emptyCart)}</p>`;
      updateContactLinks();
      return;
    }
    requestItems.innerHTML = [...cart.values()].map(({ product, quantity }) => `
      <div class="request-row">
        <span class="request-product-name">${escapeHtml(product.name)}</span>
        <label class="request-quantity"><span>${document.documentElement.lang === "te" ? "పరిమాణం" : "Qty"}</span>
          <input type="number" min="1" max="${Math.min(99, Number(product.stock_quantity))}" value="${quantity}" inputmode="numeric" data-cart-quantity="${escapeHtml(product.id)}" aria-label="Quantity of ${escapeHtml(product.name)}">
        </label>
        <button class="remove-request" type="button" data-remove-id="${escapeHtml(product.id)}" aria-label="Remove ${escapeHtml(product.name)}">×</button>
      </div>`).join("");
    requestItems.querySelectorAll("[data-cart-quantity]").forEach((input) => {
      input.addEventListener("change", () => {
        const entry = cart.get(input.dataset.cartQuantity);
        if (!entry) return;
        const max = Math.min(99, Number(entry.product.stock_quantity));
        entry.quantity = Math.max(1, Math.min(max, Number.parseInt(input.value, 10) || 1));
        renderRequest();
      });
    });
    requestItems.querySelectorAll("[data-remove-id]").forEach((button) => {
      button.addEventListener("click", () => {
        cart.delete(button.dataset.removeId);
        renderRequest();
      });
    });
    updateContactLinks();
  }

  function addToRequest(productId) {
    const product = products.find((item) => item.id === productId);
    if (!product || Number(product.stock_quantity) <= 0) return;
    const current = cart.get(productId);
    if (current) {
      current.quantity = Math.min(Number(product.stock_quantity), 99, current.quantity + 1);
    } else {
      cart.set(productId, { product, quantity: 1 });
    }
    renderRequest();
    const button = productGrid.querySelector(`[data-product-id="${CSS.escape(productId)}"]`);
    if (button) {
      const oldText = button.textContent;
      button.textContent = strings().added;
      window.setTimeout(() => {
        if (button.isConnected) button.textContent = oldText;
      }, 1000);
    }
    requestItems.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function loadProducts() {
    if (!isConfigured()) {
      catalogueState = "unconfigured";
      products.splice(0);
      productGrid.replaceChildren();
      emptyState.classList.remove("hidden");
      setCatalogueStatus(strings().unconfigured);
      renderRequest();
      return;
    }

    catalogueState = "loading";
    setCatalogueStatus(strings().loading);
    document.querySelector("#catalogue-refresh").disabled = true;
    try {
      const response = await fetch(apiUrl("/rest/v1/products?select=id,name,category,brand,sku,vehicle_fit,description,price,stock_quantity,image_path&is_published=eq.true&order=name.asc"), {
        headers: publicHeaders()
      });
      if (!response.ok) throw new Error(await readError(response));
      const result = await response.json();
      if (!Array.isArray(result)) throw new Error("The product catalogue response was invalid.");
      products.splice(0, products.length, ...result);
      catalogueState = "ready";
      catalogueError = "";
      for (const [id, item] of cart) {
        const updated = products.find((product) => product.id === id);
        if (!updated || Number(updated.stock_quantity) < item.quantity) cart.delete(id);
        else item.product = updated;
      }
      buildCategories();
      renderProducts();
      renderRequest();
    } catch (error) {
      catalogueState = "error";
      catalogueError = error instanceof Error ? error.message : String(error);
      products.splice(0);
      productGrid.replaceChildren();
      emptyState.classList.remove("hidden");
      setCatalogueStatus(`${strings().failed} ${catalogueError}`, true);
      renderRequest();
    } finally {
      document.querySelector("#catalogue-refresh").disabled = false;
    }
  }

  function updateWhatsAppFollowup(name, phone, message, items, orderId) {
    const number = String(config.whatsappNumber || "919573384280").replace(/\D/g, "");
    const itemSummary = items.map(({ product, quantity }) => `${product.name} × ${quantity}`).join(", ");
    const text = [
      "Hello, I just sent an order request on your website.",
      `Request reference: ${orderId}`,
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Items: ${itemSummary}`,
      message ? `Note: ${message}` : ""
    ].filter(Boolean).join("\n");
    whatsappFollowup.href = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (!isConfigured()) {
      orderResult.textContent = strings().unconfigured;
      return;
    }
    if (cart.size === 0) {
      orderResult.textContent = strings().noProducts;
      return;
    }
    if (!orderForm.reportValidity()) return;

    const formData = new FormData(orderForm);
    const name = String(formData.get("customer_name") || "").trim();
    const phone = String(formData.get("customer_phone") || "").trim();
    const message = String(formData.get("customer_message") || "").trim();
    const items = [...cart.values()].map((item) => ({ ...item }));
    isSendingOrder = true;
    orderButton.disabled = true;
    orderResult.classList.remove("error", "success");
    orderResult.textContent = strings().sending;
    whatsappFollowup.classList.add("hidden");

    try {
      const response = await fetch(apiUrl("/rest/v1/rpc/create_order"), {
        method: "POST",
        headers: { ...publicHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          p_name: name,
          p_phone: phone,
          p_message: message,
          p_items: items.map(({ product, quantity }) => ({ product_id: product.id, quantity }))
        })
      });
      if (!response.ok) throw new Error(await readError(response));
      const orderId = await response.json();
      if (typeof orderId !== "string" || !orderId) throw new Error("The server did not return a request reference.");
      cart.clear();
      orderForm.reset();
      orderResult.textContent = strings().requestSaved(orderId.slice(0, 8).toUpperCase());
      orderResult.classList.add("success");
      updateWhatsAppFollowup(name, phone, message, items, orderId.slice(0, 8).toUpperCase());
      whatsappFollowup.classList.remove("hidden");
      renderRequest();
    } catch (error) {
      catalogueError = error instanceof Error ? error.message : String(error);
      orderResult.textContent = `${strings().orderFailed} ${catalogueError}`;
      orderResult.classList.add("error");
    } finally {
      isSendingOrder = false;
      orderButton.disabled = cart.size === 0 || !isConfigured();
    }
  }

  searchInput.addEventListener("input", () => {
    selectedProductGroup = "";
    renderProducts();
  });
  categorySelect.addEventListener("change", () => {
    selectedProductGroup = "";
    renderProducts();
  });
  categoryCards.forEach((card) => {
    card.addEventListener("click", () => {
      selectedProductGroup = selectedProductGroup === card.dataset.productGroup ? "" : card.dataset.productGroup;
      searchInput.value = "";
      categorySelect.value = "";
      renderProducts();
      productGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  document.querySelector("#catalogue-refresh").addEventListener("click", loadProducts);
  orderForm.addEventListener("submit", submitOrder);
  window.addEventListener("languagechange", () => {
    if (catalogueState === "ready") {
      buildCategories();
      renderProducts();
    } else if (catalogueState === "unconfigured") {
      setCatalogueStatus(strings().unconfigured);
      emptyState.querySelector("strong").textContent = strings().empty;
      updateContactLinks();
    } else if (catalogueState === "error") {
      setCatalogueStatus(`${strings().failed} ${catalogueError}`, true);
    } else {
      setCatalogueStatus(strings().loading);
    }
    renderRequest();
  });

  updateContactLinks();
  renderRequest();
  loadProducts();
})();
