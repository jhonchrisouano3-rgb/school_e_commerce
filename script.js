
const STORAGE_KEY = "vsuCampusMartData";
const SESSION_KEY = "vsuCampusMartSession";

let currentUser = null;
let searchTerm = "";

function makeId(prefix = "id") {
  return prefix + "_" + Date.now().toString(36) +
    Math.random().toString(36).slice(2, 7);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function peso(value) {
  return "₱" + Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function seedData() {
  let data;

  try {
    data = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    data = null;
  }

  if (!data || !Array.isArray(data.users)) {
    data = {
      users: [{
        id: "admin-account",
        name: "CampusMart Administrator",
        schoolId: "admin001",
        password: "Admin123!",
        role: "admin",
        verificationStatus: "Approved",
        schoolPicture: ""
      }],
      products: [
        {
          id: "p_notebook",
          name: "School Notebook",
          category: "Notebooks",
          description: "Notebook for everyday school activities.",
          price: 35,
          stock: 50,
          sellerId: "admin-account",
          image: ""
        },
        {
          id: "p_ballpen",
          name: "Ballpen",
          category: "Writing Materials",
          description: "Ballpen for notes and assignments.",
          price: 12,
          stock: 100,
          sellerId: "admin-account",
          image: ""
        },
        {
          id: "p_folder",
          name: "Document Folder",
          category: "School Supplies",
          description: "Folder for organizing school documents.",
          price: 25,
          stock: 40,
          sellerId: "admin-account",
          image: ""
        }
      ],
      orders: [],
      carts: {}
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  if (!Array.isArray(data.products)) data.products = [];
  if (!Array.isArray(data.orders)) data.orders = [];
  if (!data.carts || typeof data.carts !== "object") data.carts = {};

  if (!data.users.some(user => user.role === "admin")) {
    data.users.push({
      id: "admin-account",
      name: "CampusMart Administrator",
      schoolId: "admin001",
      password: "Admin123!",
      role: "admin",
      verificationStatus: "Approved",
      schoolPicture: ""
    });
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

function getData() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && Array.isArray(data.users)) return data;
  } catch {}
  return seedData();
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function refreshSession() {
  const sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    currentUser = null;
    return;
  }

  const data = getData();
  currentUser = data.users.find(user => user.id === sessionId) || null;

  if (!currentUser) {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

function badge(status) {
  const safe = esc(status || "Pending");
  const css = String(status || "Pending").toLowerCase();
  return `<span class="badge ${esc(css)}">${safe}</span>`;
}

function productImage(product) {
  if (product.image) {
    return `<img src="${esc(product.image)}" alt="${esc(product.name)}">`;
  }

  const icons = {
    Notebooks: "📒",
    "Writing Materials": "🖊️",
    "School Supplies": "🎒",
    Books: "📚",
    Uniforms: "👕"
  };

  return esc(icons[product.category] || "📦");
}

function showMessage(id, message, isError = true) {
  const element = document.getElementById(id);
  if (!element) return;

  element.className = isError ? "error" : "success";
  element.textContent = message;
}

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    button.textContent = "Hide";
    button.setAttribute("aria-label", "Hide password");
  } else {
    input.type = "password";
    button.textContent = "Show";
    button.setAttribute("aria-label", "Show password");
  }
}

function goHome() {
  if (!currentUser) {
    loginPage();
  } else {
    render();
  }
}

function navigate(page) {
  if (!currentUser) {
    loginPage();
    return;
  }

  if (currentUser.verificationStatus !== "Approved" &&
      currentUser.role !== "admin") {
    loginPage();
    return;
  }

  const pages = {
    home: render,
    products: productsPage,
    cart: cartPage,
    history: historyPage,
    seller: sellerDashboard,
    sellerProducts: sellerPage,
    sellerOrders: sellerOrdersPage,
    admin: adminPage,
    adminOrders: adminOrdersPage
  };

  (pages[page] || render)();
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  currentUser = null;
  renderNav();
  loginPage();
}

function renderNav() {
  const nav = document.getElementById("main-nav");
  if (!nav) return;

  if (!currentUser) {
    nav.innerHTML = "";
    return;
  }

  let html = `<button onclick="goHome()">Dashboard</button>`;

  if (currentUser.role === "admin") {
    html += `
      <button onclick="navigate('admin')">Admin Verification</button>
      <button onclick="navigate('products')">Products</button>
      <button onclick="navigate('adminOrders')">Orders</button>
    `;
  } else if (currentUser.role === "seller") {
    html += `
      <button onclick="navigate('seller')">Seller Dashboard</button>
      <button onclick="navigate('sellerProducts')">My Products</button>
      <button onclick="navigate('sellerOrders')">My Orders</button>
    `;
  } else {
    html += `
      <button onclick="navigate('products')">Products</button>
      <button onclick="navigate('cart')">Cart (${cartCount()})</button>
      <button onclick="navigate('history')">Purchase History</button>
    `;
  }

  html += `<button onclick="logout()">Logout</button>`;
  nav.innerHTML = html;
}

function render() {
  refreshSession();
  renderNav();

  if (!currentUser) {
    loginPage();
    return;
  }

  if (currentUser.role === "admin") {
    adminPage();
  } else if (currentUser.verificationStatus !== "Approved") {
    loginPage();
  } else if (currentUser.role === "seller") {
    sellerDashboard();
  } else {
    studentDashboard();
  }
}

function loginPage() {
  renderNav();

  document.getElementById("app").innerHTML = `
    <section class="card auth-card">
      <h2>Login to CampusMart</h2>
      <p class="small-text">Sign in using your School ID Number and password.</p>

      <form onsubmit="login(event)">
        <label for="login-school-id">School ID Number</label>
        <input id="login-school-id" required autocomplete="username"
          placeholder="Enter your School ID Number">

        <label for="login-password">Password</label>
        <div class="password-wrap">
          <input id="login-password" type="password" required
            autocomplete="current-password" placeholder="Enter your password">
          <button class="password-toggle" type="button"
            onclick="togglePassword('login-password', this)">Show</button>
        </div>

        <div class="actions">
          <button type="submit">Login</button>
          <button type="button" class="secondary"
            onclick="registerPage()">Create Account</button>
        </div>
      </form>

      <p id="login-message" class="error"></p>

      <div class="notice">
        <strong>Admin demo account</strong><br>
        School ID: admin001<br>
        Password: Admin123!
      </div>
      <p class="small-text">
        Newly registered Student / Buyer and Seller accounts need admin approval
        before they can log in.
      </p>
    </section>
  `;
}

function login(event) {
  event.preventDefault();

  const schoolId = document.getElementById("login-school-id")
    .value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;

  const data = getData();
  const user = data.users.find(account =>
    String(account.schoolId).toLowerCase() === schoolId &&
    account.password === password
  );

  if (!user) {
    showMessage("login-message", "Invalid School ID Number or password.");
    return;
  }

  if (user.role !== "admin" && user.verificationStatus !== "Approved") {
    let message = "Your account is waiting for admin approval.";

    if (user.verificationStatus === "Rejected") {
      message = "Your account was rejected. Please contact the administrator.";
    }

    showMessage("login-message", message);
    return;
  }

  currentUser = user;
  sessionStorage.setItem(SESSION_KEY, user.id);
  render();
}

function registerPage() {
  renderNav();

  document.getElementById("app").innerHTML = `
    <section class="card auth-card">
      <h2>Create an Account</h2>
      <p class="small-text">
        Student / Buyer and Seller accounts must submit a school ID picture.
        Your account will be sent to the administrator for approval.
      </p>

      <form id="register-form" onsubmit="register(event)">
        <label for="register-role">Account Type</label>
        <select id="register-role" required>
          <option value="student">Student / Buyer</option>
          <option value="seller">Seller</option>
        </select>

        <label for="register-name">Full Name</label>
        <input id="register-name" required maxlength="100"
          placeholder="Enter your full name">

        <label for="register-school-id">School ID Number</label>
        <input id="register-school-id" required maxlength="50"
          placeholder="Enter your School ID Number">

        <label for="register-password">Password</label>
        <div class="password-wrap">
          <input id="register-password" type="password" required minlength="6"
            autocomplete="new-password" placeholder="At least 6 characters">
          <button class="password-toggle" type="button"
            onclick="togglePassword('register-password', this)">Show</button>
        </div>

        <label for="register-confirm-password">Confirm Password</label>
        <div class="password-wrap">
          <input id="register-confirm-password" type="password" required
            minlength="6" autocomplete="new-password"
            placeholder="Re-enter your password">
          <button class="password-toggle" type="button"
            onclick="togglePassword('register-confirm-password', this)">Show</button>
        </div>

        <label for="register-school-picture">School ID Picture</label>
        <input id="register-school-picture" type="file"
          accept="image/*" required>
        <p class="small-text">Image file only, maximum 2 MB.</p>
        <img id="school-picture-preview" class="school-photo"
          alt="School ID preview" style="display:none">

        <div class="actions">
          <button type="submit">Register</button>
          <button type="button" class="secondary"
            onclick="loginPage()">Back to Login</button>
        </div>
        <p id="register-message" class="error"></p>
      </form>
    </section>
  `;

  document.getElementById("register-school-picture")
    .addEventListener("change", previewSchoolImage);
}

function previewSchoolImage() {
  const file = document.getElementById("register-school-picture").files[0];
  const preview = document.getElementById("school-picture-preview");

  if (!file) {
    preview.style.display = "none";
    preview.src = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    showMessage("register-message", "Please select an image file.");
    this.value = "";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    showMessage("register-message", "The image must not exceed 2 MB.");
    document.getElementById("register-school-picture").value = "";
    preview.style.display = "none";
    return;
  }

  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
}

function register(event) {
  event.preventDefault();

  const role = document.getElementById("register-role").value;
  const name = document.getElementById("register-name").value.trim();
  const schoolId = document.getElementById("register-school-id").value.trim();
  const password = document.getElementById("register-password").value;
  const confirmPassword =
    document.getElementById("register-confirm-password").value;
  const file = document.getElementById("register-school-picture").files[0];

  if (!name || !schoolId || !password) {
    showMessage("register-message", "Please complete all required fields.");
    return;
  }

  if (schoolId.toLowerCase() === "admin001") {
    showMessage("register-message", "That School ID Number cannot be used.");
    return;
  }

  if (password.length < 6) {
    showMessage("register-message", "Password must be at least 6 characters.");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("register-message", "Passwords do not match.");
    return;
  }

  if (!file || !file.type.startsWith("image/")) {
    showMessage("register-message", "Please upload a school ID picture.");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    showMessage("register-message", "The image must not exceed 2 MB.");
    return;
  }

  const data = getData();

  if (data.users.some(user =>
    String(user.schoolId).toLowerCase() === schoolId.toLowerCase()
  )) {
    showMessage("register-message", "That School ID Number is already registered.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function () {
    const newUser = {
      id: makeId("user"),
      name,
      schoolId,
      password,
      role: role === "seller" ? "seller" : "student",
      verificationStatus: "Pending",
      schoolPicture: reader.result
    };

    const latestData = getData();

    if (latestData.users.some(user =>
      String(user.schoolId).toLowerCase() === schoolId.toLowerCase()
    )) {
      showMessage("register-message", "That School ID Number is already registered.");
      return;
    }

    latestData.users.push(newUser);
    saveData(latestData);

    alert(
      "Registration successful! Your account has been sent to the admin for approval."
    );
    loginPage();
  };

  reader.onerror = function () {
    showMessage("register-message", "Unable to read the selected image.");
  };

  reader.readAsDataURL(file);
}

function studentDashboard() {
  const data = getData();
  const myOrders = data.orders.filter(order => order.buyerId === currentUser.id);

  document.getElementById("app").innerHTML = `
    <section class="card">
      <h2>Student / Buyer Dashboard</h2>
      <p>Welcome, <strong>${esc(currentUser.name)}</strong>!</p>
      <p class="small-text">School ID Number: ${esc(currentUser.schoolId)}</p>
      <div class="actions">
        <button onclick="navigate('products')">Browse Products</button>
        <button onclick="navigate('cart')">View Cart (${cartCount()})</button>
        <button class="secondary" onclick="navigate('history')">Purchase History</button>
      </div>
    </section>

    <section class="stats">
      <div class="stat"><strong>${data.products.length}</strong>Products</div>
      <div class="stat"><strong>${cartCount()}</strong>Items in Cart</div>
      <div class="stat"><strong>${myOrders.length}</strong>My Orders</div>
      <div class="stat"><strong>${myOrders.filter(o => o.status === "Completed").length}</strong>Completed Orders</div>
    </section>

    <section class="card">
      <h2>Available School Supplies</h2>
      ${productGrid(data.products.filter(p => Number(p.stock) > 0))}
    </section>
  `;
}

function productsPage() {
  const data = getData();
  const products = data.products.filter(product => {
    const text = `${product.name} ${product.category} ${product.description || ""}`
      .toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  document.getElementById("app").innerHTML = `
    <section class="card">
      <h2>School Supplies Catalog</h2>
      <div class="search-row">
        <input id="product-search" value="${esc(searchTerm)}"
          placeholder="Search products or categories"
          oninput="searchProducts(this.value)">
        <button onclick="navigate('cart')">Open Cart (${cartCount()})</button>
      </div>
      <div id="product-results">${productGrid(products)}</div>
    </section>
  `;
}

function searchProducts(value) {
  searchTerm = value;
  const data = getData();
  const products = data.products.filter(product => {
    const text = `${product.name} ${product.category} ${product.description || ""}`
      .toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const results = document.getElementById("product-results");
  if (results) results.innerHTML = productGrid(products);
}

function productGrid(products) {
  if (!products.length) {
    return `<div class="empty-state">No products available.</div>`;
  }

  return `
    <div class="product-grid">
      ${products.map(product => {
        const seller = getData().users.find(u => u.id === product.sellerId);
        const available = Number(product.stock) > 0;

        return `
          <article class="product-card">
            <div class="product-image">${productImage(product)}</div>
            <h3>${esc(product.name)}</h3>
            <p class="small-text">${esc(product.category || "School Supplies")}</p>
            <p>${esc(product.description || "")}</p>
            <p class="small-text">Seller: ${esc(seller?.name || "CampusMart")}</p>
            <p class="price">${peso(product.price)}</p>
            <p class="small-text">Stock: ${Number(product.stock) || 0}</p>
            ${
              currentUser?.role === "student" && available
                ? `<button onclick="addToCart('${esc(product.id)}')">Add to Cart</button>`
                : !available
                  ? `<button disabled>Out of Stock</button>`
                  : `<p class="small-text">Student / Buyer accounts can purchase products.</p>`
            }
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function cartForCurrentUser() {
  const data = getData();
  if (!data.carts[currentUser.id]) data.carts[currentUser.id] = [];
  return data.carts[currentUser.id];
}

function cartCount() {
  if (!currentUser || currentUser.role !== "student") return 0;
  return cartForCurrentUser().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function addToCart(productId) {
  const data = getData();
  const product = data.products.find(p => p.id === productId);

  if (!product || Number(product.stock) <= 0) {
    alert("This product is currently unavailable.");
    return;
  }

  if (!data.carts[currentUser.id]) data.carts[currentUser.id] = [];
  const cart = data.carts[currentUser.id];
  const existing = cart.find(item => item.productId === productId);
  const currentQuantity = existing ? Number(existing.quantity) : 0;

  if (currentQuantity >= Number(product.stock)) {
    alert("You cannot add more than the available stock.");
    return;
  }

  if (existing) existing.quantity += 1;
  else cart.push({ productId, quantity: 1 });

  saveData(data);
  alert("Product added to cart.");
  renderNav();
}

function changeQuantity(productId, change) {
  const data = getData();
  const cart = data.carts[currentUser.id] || [];
  const item = cart.find(entry => entry.productId === productId);
  const product = data.products.find(entry => entry.id === productId);

  if (!item || !product) return;

  const nextQuantity = Number(item.quantity) + change;

  if (nextQuantity <= 0) {
    data.carts[currentUser.id] = cart.filter(entry => entry.productId !== productId);
  } else if (nextQuantity > Number(product.stock)) {
    alert("Quantity exceeds available stock.");
    return;
  } else {
    item.quantity = nextQuantity;
  }

  saveData(data);
  cartPage();
  renderNav();
}

function removeFromCart(productId) {
  const data = getData();
  data.carts[currentUser.id] =
    (data.carts[currentUser.id] || []).filter(item => item.productId !== productId);
  saveData(data);
  cartPage();
  renderNav();
}

function cartPage() {
  const data = getData();
  const cart = data.carts[currentUser.id] || [];

  const items = cart.map(item => {
    const product = data.products.find(p => p.id === item.productId);
    return product ? { ...item, product } : null;
  }).filter(Boolean);

  const total = items.reduce((sum, item) =>
    sum + Number(item.product.price) * Number(item.quantity), 0);

  document.getElementById("app").innerHTML = `
    <section class="card">
      <h2>My Shopping Cart</h2>
      ${
        items.length
          ? `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th>Action</th></tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                    <tr>
                      <td>${esc(item.product.name)}</td>
                      <td>${peso(item.product.price)}</td>
                      <td>
                        <button onclick="changeQuantity('${esc(item.productId)}', -1)">−</button>
                        ${Number(item.quantity)}
                        <button onclick="changeQuantity('${esc(item.productId)}', 1)">+</button>
                      </td>
                      <td>${peso(Number(item.product.price) * Number(item.quantity))}</td>
                      <td><button class="danger" onclick="removeFromCart('${esc(item.productId)}')">Remove</button></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
            <h3>Total: ${peso(total)}</h3>
            <div class="actions">
              <button onclick="checkoutPage()">Proceed to Checkout</button>
              <button class="secondary" onclick="navigate('products')">Continue Shopping</button>
            </div>
          `
          : `<div class="empty-state">Your cart is empty.</div>
             <div class="actions"><button onclick="navigate('products')">Browse Products</button></div>`
      }
    </section>
  `;
}

function checkoutPage() {
  const data = getData();
  const cart = data.carts[currentUser.id] || [];

  const items = cart.map(item => {
    const product = data.products.find(p => p.id === item.productId);
    return product ? { ...item, product } : null;
  }).filter(Boolean);

  if (!items.length) {
    alert("Your cart is empty.");
    cartPage();
    return;
  }

  const total = items.reduce((sum, item) =>
    sum + Number(item.product.price) * Number(item.quantity), 0);

  document.getElementById("app").innerHTML = `
    <section class="card">
      <h2>Checkout</h2>
      <p>Please confirm your delivery method and order details.</p>

      <form onsubmit="placeOrder(event)">
        <label for="delivery-method">Delivery Method</label>
        <select id="delivery-method" required onchange="togglePaymentFields()">
          <option value="Pickup">Pick Up</option>
          <option value="COD">Cash on Delivery (COD)</option>
        </select>

        <div id="address-section" style="display:none">
          <label for="delivery-address">Delivery Address</label>
          <textarea id="delivery-address"
            placeholder="Enter your complete delivery address"></textarea>
        </div>

        <label for="payment-method">Payment Method</label>
        <select id="payment-method" required>
          <option value="Pay at Pickup">Pay at Pickup</option>
        </select>

        <h3>Order Summary</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Quantity</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${esc(item.product.name)}</td>
                  <td>${Number(item.quantity)}</td>
                  <td>${peso(Number(item.product.price) * Number(item.quantity))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <h3>Total: ${peso(total)}</h3>
        <div class="actions">
          <button type="submit">Place Order</button>
          <button type="button" class="secondary" onclick="cartPage()">Back to Cart</button>
        </div>
      </form>
    </section>
  `;

  togglePaymentFields();
}

function togglePaymentFields() {
  const method = document.getElementById("delivery-method");
  const payment = document.getElementById("payment-method");
  const addressSection = document.getElementById("address-section");
  const address = document.getElementById("delivery-address");

  if (!method || !payment) return;

  if (method.value === "COD") {
    addressSection.style.display = "block";
    address.required = true;

    payment.innerHTML = `
      <option value="Cash">Cash</option>
      <option value="GCash">GCash</option>
      <option value="Maya">Maya</option>
      <option value="Landbank">Landbank</option>
      <option value="BPI">BPI</option>
      <option value="Credit Card">Credit Card</option>
      <option value="Debit Card">Debit Card</option>
    `;
  } else {
    addressSection.style.display = "none";
    address.required = false;
    address.value = "";
    payment.innerHTML = `<option value="Pay at Pickup">Pay at Pickup</option>`;
  }
}

function placeOrder(event) {
  event.preventDefault();

  const data = getData();
  const cart = data.carts[currentUser.id] || [];

  if (!cart.length) {
    alert("Your cart is empty.");
    cartPage();
    return;
  }

  const deliveryMethod = document.getElementById("delivery-method").value;
  const paymentMethod = document.getElementById("payment-method").value;
  const address = document.getElementById("delivery-address")?.value.trim() || "";

  if (deliveryMethod === "COD" && !address) {
    alert("Please enter your delivery address.");
    return;
  }

  const items = [];
  let total = 0;

  for (const item of cart) {
    const product = data.products.find(p => p.id === item.productId);
    if (!product) {
      alert("A product in your cart is no longer available.");
      return;
    }

    if (Number(item.quantity) <= 0 || Number(item.quantity) > Number(product.stock)) {
      alert(`Not enough stock for ${product.name}. Please update your cart.`);
      return;
    }

    items.push({
      productId: product.id,
      name: product.name,
      sellerId: product.sellerId,
      price: Number(product.price),
      quantity: Number(item.quantity)
    });

    total += Number(product.price) * Number(item.quantity);
  }

  for (const item of items) {
    const product = data.products.find(p => p.id === item.productId);
    product.stock = Number(product.stock) - Number(item.quantity);
  }

  const order = {
    id: makeId("order"),
    buyerId: currentUser.id,
    buyerName: currentUser.name,
    buyerSchoolId: currentUser.schoolId,
    items,
    total,
    deliveryMethod,
    paymentMethod,
    address: deliveryMethod === "COD" ? address : "",
    status: "Pending",
    createdAt: new Date().toLocaleString()
  };

  data.orders.push(order);
  data.carts[currentUser.id] = [];
  saveData(data);

  alert("Your order has been placed successfully!");
  renderNav();
  historyPage();
}

function historyPage() {
  const data = getData();
  const orders = data.orders
    .filter(order => order.buyerId === currentUser.id)
    .slice()
    .reverse();

  document.getElementById("app").innerHTML = `
    <section class="card">
      <h2>My Purchase History</h2>
      ${
        orders.length
          ? `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th><th>Date</th><th>Items</th><th>Total</th>
                    <th>Delivery</th><th>Address</th><th>Payment</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${orders.map(order => `
                    <tr>
                      <td>${esc(order.id)}</td>
                      <td>${esc(order.createdAt)}</td>
                      <td>${order.items.map(item =>
                        `${esc(item.name)} × ${Number(item.quantity)}`
                      ).join("<br>")}</td>
                      <td>${peso(order.total)}</td>
                      <td>${esc(order.deliveryMethod)}</td>
                      <td>${esc(order.address || "Not provided")}</td>
                      <td>${esc(order.paymentMethod)}</td>
                      <td>${badge(order.status)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `
          : `<div class="empty-state">You have no purchases yet.</div>`
      }
    </section>
  `;
}

function sellerDashboard() {
  const data = getData();
  const myProducts = data.products.filter(p => p.sellerId === currentUser.id);
  const myOrders = data.orders.filter(order =>
    order.items.some(item => item.sellerId === currentUser.id)
  );

  document.getElementById("app").innerHTML = `
    <section class="card">
      <h2>Seller Dashboard</h2>
      <p>Welcome, <strong>${esc(currentUser.name)}</strong>!</p>
      <p class="small-text">School ID Number: ${esc(currentUser.schoolId)}</p>
      <div class="actions">
        <button onclick="navigate('sellerProducts')">Manage My Products</button>
        <button onclick="navigate('sellerOrders')">View Orders</button>
      </div>
    </section>

    <section class="stats">
      <div class="stat"><strong>${myProducts.length}</strong>My Products</div>
      <div class="stat"><strong>${myProducts.reduce((sum, p) => sum + Number(p.stock || 0), 0)}</strong>Total Stock</div>
      <div class="stat"><strong>${myOrders.length}</strong>Orders Containing My Products</div>
      <div class="stat"><strong>${myOrders.filter(o => o.status === "Completed").length}</strong>Completed Orders</div>
    </section>

    <section class="card">
      <h2>My Products</h2>
      ${myProducts.length ? productGrid(myProducts) : `<div class="empty-state">You have not added any products yet.</div>`}
    </section>
  `;
}

function sellerPage() {
  const data = getData();
  const products = data.products.filter(p => p.sellerId === currentUser.id);

  document.getElementById("app").innerHTML = `
    <section class="card">
      <h2>Add a Product</h2>
      <form onsubmit="saveNewProduct(event)">
        <div class="form-grid">
          <div>
            <label for="new-product-name">Product Name</label>
            <input id="new-product-name" required maxlength="100">
          </div>
          <div>
            <label for="new-product-category">Category</label>
            <select id="new-product-category" required>
              <option>School Supplies</option>
              <option>Notebooks</option>
              <option>Writing Materials</option>
              <option>Books</option>
              <option>Uniforms</option>
            </select>
          </div>
          <div>
            <label for="new-product-price">Price (₱)</label>
            <input id="new-product-price" type="number" min="0.01"
              step="0.01" required>
          </div>
          <div>
            <label for="new-product-stock">Stock</label>
            <input id="new-product-stock" type="number" min="0"
              step="1" required>
          </div>
          <div class="full-width">
            <label for="new-product-description">Description</label>
            <textarea id="new-product-description"></textarea>
          </div>
          <div class="full-width">
            <label for="new-product-image">Product Image (optional)</label>
            <input id="new-product-image" type="file" accept="image/*">
            <p class="small-text">Maximum image size: 2 MB.</p>
          </div>
        </div>
        <div class="actions"><button type="submit">Add Product</button></div>
        <p id="product-message"></p>
      </form>
    </section>

    <section class="card">
      <h2>My Products</h2>
      ${
        products.length
          ? `
            <div class="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead>
                <tbody>
                  ${products.map(p => `
                    <tr>
                      <td>${esc(p.name)}</td>
                      <td>${esc(p.category)}</td>
                      <td>${peso(p.price)}</td>
                      <td>${Number(p.stock)}</td>
                      <td><button class="danger" onclick="deleteMyProduct('${esc(p.id)}')">Delete</button></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `
          : `<div class="empty-state">No products have been added.</div>`
      }
    </section>
  `;
}

function saveNewProduct(event) {
  event.preventDefault();

  const name = document.getElementById("new-product-name").value.trim();
  const category = document.getElementById("new-product-category").value;
  const price = Number(document.getElementById("new-product-price").value);
  const stock = Number(document.getElementById("new-product-stock").value);
  const description = document.getElementById("new-product-description").value.trim();
  const file = document.getElementById("new-product-image").files[0];

  if (!name || !Number.isFinite(price) || price <= 0 ||
      !Number.isInteger(stock) || stock < 0) {
    showMessage("product-message", "Enter a valid name, price, and stock.");
    return;
  }

  function saveProduct(image = "") {
    const data = getData();

    data.products.push({
      id: makeId("product"),
      name,
      category,
      price,
      stock,
      description,
      image,
      sellerId: currentUser.id
    });

    try {
      saveData(data);
      sellerPage();
      alert("Product added successfully.");
    } catch {
      showMessage("product-message", "Unable to save. Try a smaller image.");
    }
  }

  if (file) {
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      showMessage("product-message", "Select an image under 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => saveProduct(reader.result);
    reader.onerror = () => showMessage("product-message", "Unable to read image.");
    reader.readAsDataURL(file);
  } else {
    saveProduct("");
  }
}

function deleteMyProduct(productId) {
  if (!confirm("Delete this product?")) return;

  const data = getData();
  const product = data.products.find(p => p.id === productId);

  if (!product || product.sellerId !== currentUser.id) return;

  data.products = data.products.filter(p => p.id !== productId);

  for (const userId of Object.keys(data.carts)) {
    data.carts[userId] = (data.carts[userId] || [])
      .filter(item => item.productId !== productId);
  }

  saveData(data);
  sellerPage();
}

function sellerOrdersPage() {
  const data = getData();
  const orders = data.orders.filter(order =>
    order.items.some(item => item.sellerId === currentUser.id)
  ).slice().reverse();

  document.getElementById("app").innerHTML = `
    <section class="card">
      <h2>Orders Containing My Products</h2>
      ${
        orders.length
          ? `
            <div class="table-wrap">
              <table>
                <thead><tr><th>Order ID</th><th>Buyer</th><th>Items</th><th>Total Order</th><th>Delivery</th><th>Address</th><th>Payment</th><th>Status</th></tr></thead>
                <tbody>
                  ${orders.map(order => {
                    const myItems = order.items.filter(item => item.sellerId === currentUser.id);
                    return `
                      <tr>
                        <td>${esc(order.id)}</td>
                        <td>${esc(order.buyerName)}</td>
                        <td>${myItems.map(item => `${esc(item.name)} × ${Number(item.quantity)}`).join("<br>")}</td>
                        <td>${peso(order.total)}</td>
                        <td>${esc(order.deliveryMethod)}</td>
                        <td>${esc(order.address || "Not provided")}</td>
                        <td>${esc(order.paymentMethod)}</td>
                        <td>${badge(order.status)}</td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          `
          : `<div class="empty-state">No orders contain your products yet.</div>`
      }
    </section>
  `;
}

function adminPage() {
  const data = getData();
  const students = data.users.filter(user => user.role === "student");
  const sellers = data.users.filter(user => user.role === "seller");
  const pending = data.users.filter(user => user.verificationStatus === "Pending").length;

  document.getElementById("app").innerHTML = `
    <section class="card">
      <h2>Admin Dashboard</h2>
      <p>Welcome, <strong>${esc(currentUser.name)}</strong>.</p>
      <div class="actions">
        <button onclick="navigate('adminOrders')">Manage Orders</button>
        <button onclick="navigate('products')">View Product Catalog</button>
      </div>
    </section>

    <section class="stats">
      <div class="stat"><strong>${students.length}</strong>Student / Buyer Accounts</div>
      <div class="stat"><strong>${sellers.length}</strong>Seller Accounts</div>
      <div class="stat"><strong>${pending}</strong>Pending Approvals</div>
      <div class="stat"><strong>${data.orders.length}</strong>Total Orders</div>
    </section>

    <section class="card">
      <h2>Student / Buyer Verification</h2>
      <p class="small-text">
        New Student / Buyer registrations appear here automatically.
        Review the school ID picture before approving or rejecting an account.
      </p>
      ${verificationTable(students)}
    </section>

    <section class="card">
      <h2>Seller Verification</h2>
      <p class="small-text">
        New Seller registrations appear here automatically.
        Review the school ID picture before allowing the seller to use the dashboard.
      </p>
      ${verificationTable(sellers)}
    </section>

    <section class="card">
      <h2>All Products</h2>
      ${adminProductsTable(data.products)}
    </section>
  `;
}

function verificationTable(users) {
  if (!users.length) {
    return `<div class="empty-state">No accounts in this section yet.</div>`;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>School ID Number</th>
            <th>Full Name</th>
            <th>School ID Picture</th>
            <th>Password</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr>
              <td>${esc(user.schoolId)}</td>
              <td>${esc(user.name)}</td>
              <td>
                ${
                  user.schoolPicture
                    ? `<a href="${esc(user.schoolPicture)}" target="_blank" rel="noopener">View Picture</a>
                       <br><img class="school-photo" src="${esc(user.schoolPicture)}" alt="School ID picture">`
                    : "No picture"
                }
              </td>
              <td>
                <div class="password-wrap">
                  <input class="admin-password-field"
                    id="admin-password-${esc(user.id)}"
                    type="password" value="${esc(user.password)}" readonly
                    aria-label="Stored password for ${esc(user.name)}">
                  <button type="button" class="password-toggle"
                    onclick="togglePassword('admin-password-${esc(user.id)}', this)">Show</button>
                </div>
              </td>
              <td>${badge(user.verificationStatus)}</td>
              <td>
                <button onclick="reviewAccount('${esc(user.id)}', 'Approved')">Approve</button>
                <button class="danger" onclick="reviewAccount('${esc(user.id)}', 'Rejected')">Reject</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function reviewAccount(userId, status) {
  const data = getData();
  const user = data.users.find(account => account.id === userId);

  if (!user || !["student", "seller"].includes(user.role)) return;

  const action = status === "Approved" ? "approve" : "reject";
  if (!confirm(`Are you sure you want to ${action} ${user.name}'s account?`)) {
    return;
  }

  user.verificationStatus = status;
  saveData(data);
  adminPage();
}

function adminProductsTable(products) {
  if (!products.length) {
    return `<div class="empty-state">There are no products.</div>`;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Product</th><th>Seller</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead>
        <tbody>
          ${products.map(product => {
            const seller = getData().users.find(user => user.id === product.sellerId);
            return `
              <tr>
                <td>${esc(product.name)}</td>
                <td>${esc(seller?.name || "CampusMart")}</td>
                <td>${peso(product.price)}</td>
                <td>${Number(product.stock)}</td>
                <td><button class="danger" onclick="adminDeleteProduct('${esc(product.id)}')">Delete</button></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function adminDeleteProduct(productId) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  const data = getData();
  data.products = data.products.filter(product => product.id !== productId);

  for (const userId of Object.keys(data.carts)) {
    data.carts[userId] = (data.carts[userId] || [])
      .filter(item => item.productId !== productId);
  }

  saveData(data);
  adminPage();
}

function adminOrdersPage() {
  const data = getData();
  const orders = data.orders.slice().reverse();

  document.getElementById("app").innerHTML = `
    <section class="card">
      <h2>Order Management</h2>
      ${
        orders.length
          ? `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th><th>Buyer</th><th>Items</th><th>Total</th>
                    <th>Delivery</th><th>Delivery Address</th><th>Payment</th><th>Status</th><th>Update Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${orders.map(order => `
                    <tr>
                      <td>${esc(order.id)}</td>
                      <td>${esc(order.buyerName)}<br><span class="small-text">${esc(order.buyerSchoolId || "")}</span></td>
                      <td>${order.items.map(item =>
                        `${esc(item.name)} × ${Number(item.quantity)}`
                      ).join("<br>")}</td>
                      <td>${peso(order.total)}</td>
                      <td>${esc(order.deliveryMethod)}</td>
                      <td>${esc(order.address || "Not provided")}</td>
                      <td>${esc(order.paymentMethod)}</td>
                      <td>${badge(order.status)}</td>
                      <td>
                        <select id="order-status-${esc(order.id)}">
                          ${["Pending", "Processing", "Completed", "Cancelled"].map(status =>
                            `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`
                          ).join("")}
                        </select>
                        <button onclick="updateOrder('${esc(order.id)}')">Save</button>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `
          : `<div class="empty-state">No orders have been placed yet.</div>`
      }
    </section>
  `;
}

function updateOrder(orderId) {
  const select = document.getElementById("order-status-" + orderId);
  if (!select) return;

  const data = getData();
  const order = data.orders.find(entry => entry.id === orderId);
  if (!order) return;

  order.status = select.value;
  saveData(data);
  adminOrdersPage();
  alert("Order status updated.");
}

seedData();
refreshSession();
render();
