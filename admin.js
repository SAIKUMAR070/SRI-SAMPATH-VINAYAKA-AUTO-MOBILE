(() => {
  "use strict";

  const config = window.MTNAIDU_CONFIG || {};
  const loginPanel = document.querySelector("#admin-login-panel");
  const dashboard = document.querySelector("#admin-dashboard");
  const loginForm = document.querySelector("#admin-login-form");
  const loginButton = document.querySelector("#admin-login-button");
  const loginMessage = document.querySelector("#admin-login-message");
  const configMessage = document.querySelector("#admin-config-message");
  const dashboardMessage = document.querySelector("#dashboard-message");
  const productForm = document.querySelector("#product-form");
  const productFormMessage = document.querySelector("#product-form-message");
  const inventoryList = document.querySelector("#inventory-list");
  const orderList = document.querySelector("#order-admin-list");
  const products = new Map();
  let accessToken = "";

  function isConfigured() {
    return typeof config.supabaseUrl === "string"
      && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.supabaseUrl.trim())
      && typeof config.supabasePublishableKey === "string"
      && config.supabasePublishableKey.trim().length > 20;
  }

  function apiUrl(path) {
    return `${config.supabaseUrl.replace(/\/+$/, "")}${path}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  async function errorMessage(response) {
    const body = await response.text();
    try {
      const data = JSON.parse(body);
      return data.message || data.msg || data.error_description || body;
    } catch {
      return body;
    }
  }

  function headers(json = false) {
    const values = {
      apikey: config.supabasePublishableKey,
      Authorization: `Bearer ${accessToken || config.supabasePublishableKey}`
    };
    if (json) values["Content-Type"] = "application/json";
    return values;
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(apiUrl(path), {
      ...options,
      headers: { ...headers(options.body !== undefined && typeof options.body === "string"), ...(options.headers || {}) }
    });
    if (!response.ok) throw new Error(await errorMessage(response));
    if (response.status === 204) return null;
    const body = await response.text();
    if (!body) return null;
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  function setMessage(element, message, kind = "") {
    element.textContent = message;
    element.classList.remove("error", "success");
    if (kind) element.classList.add(kind);
  }

  function photoUrl(path) {
    if (!path) return "";
    const encodedPath = path.split("/").map((part) => encodeURIComponent(part)).join("/");
    const bucket = encodeURIComponent(config.productImageBucket || "product-images");
    return `${config.supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/${encodedPath}`;
  }

  function money(price) {
    if (price === null || price === undefined || price === "") return "Price not set";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(price));
  }

  function renderProducts(items) {
    products.clear();
    items.forEach((product) => products.set(product.id, product));
    if (items.length === 0) {
      inventoryList.innerHTML = '<p class="admin-empty">No products yet. Add your first product using the form. Unpublished products also appear here.</p>';
      return;
    }
    inventoryList.innerHTML = items.map((product) => {
      const image = product.image_path
        ? `<img src="${escapeHtml(photoUrl(product.image_path))}" alt="" loading="lazy"><span class="inventory-placeholder hidden">SV</span>`
        : '<span class="inventory-placeholder">SV</span>';
      return `<article class="inventory-item">
        ${image}
        <div class="inventory-item-copy">
          <strong>${escapeHtml(product.name)}</strong>
          <small>${escapeHtml(product.category)} · ${escapeHtml(product.brand || "No brand")} · ${escapeHtml(money(product.price))}</small>
          <small>${Number(product.stock_quantity)} in stock · ${product.is_published ? "Published" : "Hidden from customers"}</small>
        </div>
        <button type="button" data-edit-product="${escapeHtml(product.id)}">Edit</button>
      </article>`;
    }).join("");
    inventoryList.querySelectorAll("img").forEach((image) => {
      image.addEventListener("error", () => {
        image.classList.add("hidden");
        image.nextElementSibling?.classList.remove("hidden");
      }, { once: true });
    });
  }

  function renderOrders(orders) {
    if (orders.length === 0) {
      orderList.innerHTML = '<p class="admin-empty">No customer requests yet.</p>';
      return;
    }
    orderList.innerHTML = orders.map((order) => {
      const date = new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
      const lines = Array.isArray(order.items) ? order.items : [];
      const summary = lines.map((item) => `<li>${escapeHtml(item.name)} × ${Number(item.quantity) || 0}${item.unit_price === null || item.unit_price === undefined ? "" : ` · ${escapeHtml(money(item.unit_price))}`}</li>`).join("");
      const phone = String(order.customer_phone || "");
      const whatsappPhone = phone.replace(/\D/g, "").replace(/^0+/, "");
      const note = order.customer_message ? `<p class="order-customer-note">${escapeHtml(order.customer_message)}</p>` : "";
      return `<article class="order-item">
        <div class="order-item-heading">
          <div><strong>${escapeHtml(order.customer_name)}</strong><small>Request ${escapeHtml(order.id.slice(0, 8).toUpperCase())} · ${escapeHtml(date)}</small></div>
          <select class="order-status-control" data-order-status="${escapeHtml(order.id)}" aria-label="Update order request status">
            <option value="new" ${order.status === "new" ? "selected" : ""}>New</option>
            <option value="contacted" ${order.status === "contacted" ? "selected" : ""}>Contacted</option>
            <option value="fulfilled" ${order.status === "fulfilled" ? "selected" : ""}>Fulfilled</option>
            <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>Cancelled</option>
          </select>
        </div>
        <ul class="order-lines">${summary}</ul>
        <a class="order-customer-phone" href="https://wa.me/${encodeURIComponent(whatsappPhone)}?text=${encodeURIComponent(`Hello ${order.customer_name}, about your item request ${order.id.slice(0, 8).toUpperCase()}…`)}" target="_blank" rel="noopener noreferrer">WhatsApp ${escapeHtml(phone)} ↗</a>
        ${note}
      </article>`;
    }).join("");
    orderList.querySelectorAll("[data-order-status]").forEach((select) => {
      select.addEventListener("change", async () => {
        select.disabled = true;
        try {
          await apiRequest(`/rest/v1/order_requests?id=eq.${encodeURIComponent(select.dataset.orderStatus)}`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ status: select.value })
          });
          setMessage(dashboardMessage, "Request status updated.", "success");
        } catch (error) {
          setMessage(dashboardMessage, `Couldn’t update this request: ${error.message}`, "error");
          select.value = select.dataset.previousStatus || "new";
        } finally {
          select.dataset.previousStatus = select.value;
          select.disabled = false;
        }
      });
      select.dataset.previousStatus = select.value;
    });
  }

  async function refreshDashboard() {
    setMessage(dashboardMessage, "Loading products and customer requests…");
    try {
      const [productResult, orderResult] = await Promise.all([
        apiRequest("/rest/v1/products?select=*&order=name.asc"),
        apiRequest("/rest/v1/order_requests?select=id,customer_name,customer_phone,customer_message,items,status,created_at&order=created_at.desc&limit=100")
      ]);
      renderProducts(productResult);
      renderOrders(orderResult);
      setMessage(dashboardMessage, `${productResult.length} products · ${orderResult.length} requests`, "success");
    } catch (error) {
      setMessage(dashboardMessage, `Couldn’t load the dashboard: ${error.message}`, "error");
    }
  }

  async function resizePhoto(file) {
    if (!file) return null;
    const supported = ["image/jpeg", "image/png", "image/webp"];
    if (!supported.includes(file.type)) throw new Error("Choose a JPG, PNG or WebP photo.");
    if (file.size > 20 * 1024 * 1024) throw new Error("Choose a photo smaller than 20 MB.");
    if (typeof createImageBitmap !== "function") throw new Error("This browser can’t resize the selected photo. Try a smaller JPG, PNG or WebP image.");

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      throw new Error("The photo could not be prepared in this browser.");
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) throw new Error("The photo could not be compressed.");
    if (blob.size > 5 * 1024 * 1024) throw new Error("The compressed photo is still larger than 5 MB. Choose a smaller image.");
    return blob;
  }

  async function uploadPhoto(file) {
    const photo = await resizePhoto(file);
    if (!photo) return "";
    const path = `products/${crypto.randomUUID()}.jpg`;
    const bucket = encodeURIComponent(config.productImageBucket || "product-images");
    const encodedPath = path.split("/").map((part) => encodeURIComponent(part)).join("/");
    const response = await fetch(apiUrl(`/storage/v1/object/${bucket}/${encodedPath}`), {
      method: "POST",
      headers: {
        ...headers(),
        "Content-Type": "image/jpeg",
        "x-upsert": "false"
      },
      body: photo
    });
    if (!response.ok) throw new Error(`Photo upload failed: ${await errorMessage(response)}`);
    return path;
  }

  function setFormValue(name, value) {
    const field = productForm.elements.namedItem(name);
    if (field) field.value = value ?? "";
  }

  function clearProductForm() {
    productForm.reset();
    setFormValue("product_id", "");
    productForm.elements.namedItem("stock_quantity").value = "0";
    productForm.elements.namedItem("is_published").checked = true;
    document.querySelector("#product-form-title").textContent = "Add a product";
    document.querySelector("#product-save").textContent = "Save product";
    setMessage(productFormMessage, "");
  }

  function editProduct(productId) {
    const product = products.get(productId);
    if (!product) return;
    setFormValue("product_id", product.id);
    setFormValue("name", product.name);
    setFormValue("category", product.category);
    setFormValue("brand", product.brand);
    setFormValue("vehicle_fit", product.vehicle_fit);
    setFormValue("price", product.price);
    setFormValue("stock_quantity", product.stock_quantity);
    setFormValue("sku", product.sku);
    setFormValue("description", product.description);
    productForm.elements.namedItem("is_published").checked = Boolean(product.is_published);
    productForm.elements.namedItem("image").value = "";
    document.querySelector("#product-form-title").textContent = "Edit product";
    document.querySelector("#product-save").textContent = "Update product";
    setMessage(productFormMessage, product.image_path ? "Choose a new photo only if you want to replace the existing one." : "");
    productForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveProduct(event) {
    event.preventDefault();
    if (!productForm.reportValidity()) return;
    const button = document.querySelector("#product-save");
    button.disabled = true;
    setMessage(productFormMessage, "Saving the product…");
    try {
      const form = new FormData(productForm);
      const productId = String(form.get("product_id") || "");
      const existing = products.get(productId);
      const imageFile = form.get("image");
      const stock = Number.parseInt(String(form.get("stock_quantity")), 10);
      const priceValue = String(form.get("price") || "").trim();
      const payload = {
        name: String(form.get("name") || "").trim(),
        category: String(form.get("category") || ""),
        brand: String(form.get("brand") || "").trim() || null,
        vehicle_fit: String(form.get("vehicle_fit") || "").trim() || null,
        price: priceValue === "" ? null : Number(priceValue),
        stock_quantity: stock,
        sku: String(form.get("sku") || "").trim() || null,
        description: String(form.get("description") || "").trim() || null,
        is_published: productForm.elements.namedItem("is_published").checked
      };

      if (!payload.name || !payload.category || !Number.isSafeInteger(stock) || stock < 0
          || (payload.price !== null && (!Number.isFinite(payload.price) || payload.price < 0))) {
        throw new Error("Check the product name, category, price and stock quantity.");
      }

      if (imageFile instanceof File && imageFile.size > 0) {
        setMessage(productFormMessage, "Preparing the product photo…");
        payload.image_path = await uploadPhoto(imageFile);
      } else if (existing?.image_path) {
        payload.image_path = existing.image_path;
      }

      const path = productId
        ? `/rest/v1/products?id=eq.${encodeURIComponent(productId)}`
        : "/rest/v1/products";
      await apiRequest(path, {
        method: productId ? "PATCH" : "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      });
      clearProductForm();
      await refreshDashboard();
      setMessage(productFormMessage, "Product saved. The public catalogue will show it if it’s published.", "success");
    } catch (error) {
      setMessage(productFormMessage, `Couldn’t save the product: ${error.message}`, "error");
    } finally {
      button.disabled = false;
    }
  }

  async function signIn(event) {
    event.preventDefault();
    if (!isConfigured()) {
      setMessage(loginMessage, "The database setup is not finished yet. Follow the website setup guide before signing in.", "error");
      return;
    }
    if (!loginForm.reportValidity()) return;
    loginButton.disabled = true;
    setMessage(loginMessage, "Signing in…");
    try {
      const form = new FormData(loginForm);
      const response = await fetch(apiUrl("/auth/v1/token?grant_type=password"), {
        method: "POST",
        headers: { apikey: config.supabasePublishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") || "").trim(),
          password: String(form.get("password") || "")
        })
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const result = await response.json();
      if (!result.access_token) throw new Error("The sign-in response did not include an access token.");
      accessToken = result.access_token;

      const adminCheck = await apiRequest("/rest/v1/rpc/is_store_admin", {
        method: "POST",
        body: "{}"
      });
      if (adminCheck !== true) {
        accessToken = "";
        throw new Error("This account is not authorised to manage the shop. Ask the project owner to grant admin access.");
      }

      loginForm.reset();
      document.querySelector("#admin-welcome").textContent = result.user?.email || "";
      loginPanel.classList.add("hidden");
      dashboard.classList.remove("hidden");
      await refreshDashboard();
    } catch (error) {
      setMessage(loginMessage, `Sign-in failed: ${error.message}`, "error");
    } finally {
      loginButton.disabled = false;
    }
  }

  async function signOut() {
    const previousToken = accessToken;
    accessToken = "";
    dashboard.classList.add("hidden");
    loginPanel.classList.remove("hidden");
    setMessage(loginMessage, "");
    if (!previousToken) return;
    try {
      const response = await fetch(apiUrl("/auth/v1/logout"), {
        method: "POST",
        headers: {
          apikey: config.supabasePublishableKey,
          Authorization: `Bearer ${previousToken}`
        }
      });
      if (!response.ok) throw new Error(await errorMessage(response));
    } catch (error) {
      setMessage(loginMessage, `Signed out of this page; the server session could not be revoked: ${error.message}`, "error");
    }
  }

  loginForm.addEventListener("submit", signIn);
  productForm.addEventListener("submit", saveProduct);
  inventoryList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-product]");
    if (button) editProduct(button.dataset.editProduct);
  });
  document.querySelector("#product-cancel").addEventListener("click", clearProductForm);
  document.querySelector("#products-refresh").addEventListener("click", refreshDashboard);
  document.querySelector("#orders-refresh").addEventListener("click", refreshDashboard);
  document.querySelector("#admin-logout").addEventListener("click", signOut);

  if (!isConfigured()) {
    configMessage.textContent = "The database is not connected yet. Follow SUPABASE-SETUP.md to connect it before signing in.";
  } else {
    configMessage.classList.add("hidden");
  }
})();
