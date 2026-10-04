(() => {
  "use strict";

  const config = window.MTNAIDU_CONFIG || {};
  const launcher = document.querySelector("#voice-launcher");
  const panel = document.querySelector("#voice-panel");
  const closeButton = document.querySelector("#voice-close");
  const form = document.querySelector("#voice-form");
  const input = document.querySelector("#voice-input");
  const sendButton = document.querySelector("#voice-send");
  const photoButton = document.querySelector("#voice-photo-button");
  const imageInput = document.querySelector("#voice-image-input");
  const imagePreview = document.querySelector("#voice-image-preview");
  const imageThumbnail = document.querySelector("#voice-image-thumbnail");
  const imageName = document.querySelector("#voice-image-name");
  const imageRemoveButton = document.querySelector("#voice-image-remove");
  const microphoneButton = document.querySelector("#voice-microphone");
  const speechButton = document.querySelector("#voice-speech-toggle");
  const messagesElement = document.querySelector("#voice-messages");
  const statusElement = document.querySelector("#voice-status");
  const promptButtons = [...document.querySelectorAll("[data-voice-prompt]")];
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const history = [];
  let isSending = false;
  let isListening = false;
  let speakReplies = true;
  let recognition = null;
  let pendingImage = null;
  let pendingImageUrl = "";

  const copy = {
    en: {
      welcome: "Hello! Ask me about products in our catalogue, listed prices, or where to find our shop.",
      unavailable: "The voice assistant is not set up yet. Please call the shop and we’ll be happy to help.",
      empty: "Please type or say a question, or select a product photo first.",
      imageQuestion: "Please identify the product in this photo and find the closest matching items in the shop catalogue.",
      photoSize: "That photo is too large. Choose an image smaller than 12 MB.",
      photoType: "Choose a JPEG, PNG, or WebP product photo.",
      photoCompressFailed: "I couldn’t prepare that photo. Try another image.",
      photoTooLarge: "This photo could not be compressed enough to send. Try a smaller or clearer crop.",
      photoAttached: "Photo attached",
      sending: "Checking the latest shop information…",
      listening: "Listening… Speak now.",
      microphoneUnavailable: "Voice input is not available in this browser. You can type your question instead.",
      microphoneError: "I couldn’t access voice input. Check your microphone permission or type your question.",
      rateLimited: "The assistant is busy. Please wait a moment before asking again.",
      failed: "Sorry, I couldn’t reach the shop assistant just now. Please try again or call the shop.",
      replyFailed: "The assistant couldn’t provide an answer just now. Please try again or call the shop.",
      setupRequired: "The shop assistant is not connected yet. Please call 95733 84280 for help.",
      addToRequest: "Add to request",
      addedToRequest: "Added to your request. Review the request and send it when you’re ready.",
      alreadyInRequest: "That item is already in your request.",
      outOfStock: "That item is currently listed as out of stock.",
      unavailableProduct: "That product is no longer in the current catalogue. Please refresh and ask again.",
      spokenOn: "Turn spoken replies off",
      spokenOff: "Turn spoken replies on"
    },
    te: {
      welcome: "నమస్కారం! మా ఉత్పత్తులు, జాబితాలోని ధరలు లేదా మా షాప్ చిరునామా గురించి అడగండి.",
      unavailable: "వాయిస్ అసిస్టెంట్ ఇంకా సిద్ధంగా లేదు. సహాయం కోసం షాప్‌కు కాల్ చేయండి.",
      empty: "దయచేసి ముందుగా ప్రశ్నను టైప్ చేయండి లేదా మాట్లాడండి.",
      imageQuestion: "ఈ ఫోటోలోని ఉత్పత్తిని గుర్తించి, షాప్ ఉత్పత్తుల జాబితాలో దగ్గరగా సరిపోలే వాటిని కనుగొనండి.",
      photoSize: "ఈ ఫోటో చాలా పెద్దది. 12 MB కంటే చిన్న చిత్రాన్ని ఎంచుకోండి.",
      photoType: "JPEG, PNG లేదా WebP ఉత్పత్తి ఫోటోను ఎంచుకోండి.",
      photoCompressFailed: "ఈ ఫోటోను సిద్ధం చేయలేకపోయాము. మరో చిత్రాన్ని ప్రయత్నించండి.",
      photoTooLarge: "ఈ ఫోటోను పంపడానికి సరిపడా కుదించలేకపోయాము. చిన్నది లేదా స్పష్టమైన భాగాన్ని ఎంచుకోండి.",
      photoAttached: "ఫోటో జోడించబడింది",
      sending: "షాప్ తాజా వివరాలను చూస్తున్నాము…",
      listening: "వింటున్నాము… ఇప్పుడు మాట్లాడండి.",
      microphoneUnavailable: "ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ అందుబాటులో లేదు. మీ ప్రశ్నను టైప్ చేయండి.",
      microphoneError: "వాయిస్ ఇన్‌పుట్‌ను ఉపయోగించలేకపోయాము. మైక్రోఫోన్ అనుమతిని తనిఖీ చేయండి లేదా ప్రశ్న టైప్ చేయండి.",
      rateLimited: "అసిస్టెంట్ ప్రస్తుతం బిజీగా ఉంది. మళ్లీ అడగడానికి కొద్దిసేపు వేచి ఉండండి.",
      failed: "షాప్ అసిస్టెంట్‌ను ఇప్పుడు చేరుకోలేకపోయాము. మళ్లీ ప్రయత్నించండి లేదా షాప్‌కు కాల్ చేయండి.",
      replyFailed: "ఇప్పుడు సమాధానం ఇవ్వలేకపోయాము. మళ్లీ ప్రయత్నించండి లేదా షాప్‌కు కాల్ చేయండి.",
      setupRequired: "షాప్ అసిస్టెంట్ ఇంకా కనెక్ట్ కాలేదు. సహాయం కోసం 95733 84280కు కాల్ చేయండి.",
      addToRequest: "అభ్యర్థనకు జోడించండి",
      addedToRequest: "మీ అభ్యర్థనకు జోడించబడింది. పంపే ముందు అభ్యర్థనను తనిఖీ చేయండి.",
      alreadyInRequest: "ఈ ఉత్పత్తి ఇప్పటికే మీ అభ్యర్థనలో ఉంది.",
      outOfStock: "ఈ ఉత్పత్తి ప్రస్తుతం స్టాక్‌లో లేదని జాబితాలో ఉంది.",
      unavailableProduct: "ఈ ఉత్పత్తి ప్రస్తుత జాబితాలో లేదు. రిఫ్రెష్ చేసి మళ్లీ అడగండి.",
      spokenOn: "వాయిస్ సమాధానాలను ఆపండి",
      spokenOff: "వాయిస్ సమాధానాలను ప్రారంభించండి"
    }
  };

  function currentCopy() {
    return document.documentElement.lang === "te" ? copy.te : copy.en;
  }

  function setStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("error", isError);
  }

  function addMessage(role, text, suggestions = [], imageUrl = "") {
    const message = document.createElement("div");
    message.className = `voice-message voice-message-${role === "user" ? "user" : "assistant"}`;
    message.textContent = text;
    if (imageUrl) {
      const image = document.createElement("img");
      image.className = "voice-message-image";
      image.alt = currentCopy().photoAttached;
      image.src = imageUrl;
      image.addEventListener("load", () => URL.revokeObjectURL(imageUrl), { once: true });
      image.addEventListener("error", () => URL.revokeObjectURL(imageUrl), { once: true });
      message.append(image);
    }
    if (role !== "user" && suggestions.length) {
      const productList = document.createElement("div");
      productList.className = "voice-product-suggestions";
      suggestions.forEach((product) => {
        if (!product || typeof product.id !== "string" || typeof product.name !== "string") return;
        const card = document.createElement("article");
        card.className = "voice-product-card";
        const name = document.createElement("strong");
        name.textContent = product.name;
        card.append(name);
        const details = [
          product.brand,
          product.category,
          product.vehicleFit,
          product.description,
          product.price === null ? (document.documentElement.lang === "te" ? "ధర కోసం అడగండి" : "Ask for price")
            : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(product.price),
          product.inStock ? "" : (document.documentElement.lang === "te" ? "స్టాక్‌లో లేదు" : "Out of stock")
        ].filter(Boolean);
        if (details.length) {
          const summary = document.createElement("small");
          summary.textContent = details.join(" · ");
          card.append(summary);
        }
        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.textContent = currentCopy().addToRequest;
        addButton.disabled = !product.inStock;
        addButton.addEventListener("click", () => {
          addButton.disabled = true;
          window.dispatchEvent(new CustomEvent("voice-agent:add-product", {
            detail: {
              productId: product.id,
              onResult(result) {
                const copyForLanguage = currentCopy();
                if (!result.success) {
                  addButton.disabled = false;
                  const message = result.reason === "out-of-stock"
                    ? copyForLanguage.outOfStock
                    : copyForLanguage.unavailableProduct;
                  addMessage("assistant", message);
                  speak(message);
                  return;
                }
                addButton.textContent = result.alreadyAdded
                  ? copyForLanguage.alreadyInRequest
                  : copyForLanguage.addedToRequest;
                const confirmation = `${product.name}: ${result.alreadyAdded ? copyForLanguage.alreadyInRequest : copyForLanguage.addedToRequest}`;
                addMessage("assistant", confirmation);
                speak(confirmation);
              }
            }
          }));
        });
        card.append(addButton);
        productList.append(card);
      });
      if (productList.childElementCount) message.append(productList);
    }
    messagesElement.append(message);
    messagesElement.scrollTop = messagesElement.scrollHeight;
  }

  function setOpen(isOpen) {
    panel.classList.toggle("hidden", !isOpen);
    launcher.setAttribute("aria-expanded", String(isOpen));
    launcher.setAttribute("aria-label", isOpen
      ? (document.documentElement.lang === "te" ? "షాప్ వాయిస్ అసిస్టెంట్‌ను మూసివేయండి" : "Close shop voice assistant")
      : (document.documentElement.lang === "te" ? "షాప్ వాయిస్ అసిస్టెంట్‌ను తెరవండి" : "Open shop voice assistant"));
    if (isOpen) input.focus();
    else {
      stopListening();
      window.speechSynthesis?.cancel();
    }
  }

  function stopListening() {
    if (!recognition || !isListening) return;
    isListening = false;
    microphoneButton.classList.remove("voice-microphone-listening");
    try {
      recognition.stop();
    } catch (error) {
      if (error instanceof Error && error.name !== "InvalidStateError") throw error;
    }
  }

  function speak(text) {
    if (!speakReplies || !window.speechSynthesis || typeof SpeechSynthesisUtterance !== "function") return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = document.documentElement.lang === "te" ? "te-IN" : "en-IN";
    window.speechSynthesis.speak(utterance);
  }

  function assistantEndpoint() {
    if (typeof config.supabaseUrl !== "string" || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.supabaseUrl.trim())
      || typeof config.supabasePublishableKey !== "string" || config.supabasePublishableKey.trim().length < 20) {
      return "";
    }
    return `${config.supabaseUrl.replace(/\/+$/, "")}/functions/v1/voice-agent`;
  }

  async function readError(response) {
    const body = await response.text();
    try {
      return JSON.parse(body);
    } catch {
      return { error: body };
    }
  }

  function encodeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(currentCopy().photoCompressFailed));
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error(currentCopy().photoCompressFailed));
          return;
        }
        const separator = reader.result.indexOf(",");
        if (separator < 0) {
          reject(new Error(currentCopy().photoCompressFailed));
          return;
        }
        resolve({ mimeType: "image/jpeg", data: reader.result.slice(separator + 1) });
      };
      reader.readAsDataURL(file);
    });
  }

  async function prepareImage(file) {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 40000000) throw new Error(currentCopy().photoTooLarge);
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error(currentCopy().photoCompressFailed);
      const qualities = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42];
      let compressed = null;
      for (const quality of qualities) {
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        compressed = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (compressed && compressed.size <= 800 * 1024) break;
        canvas.width = Math.max(1, Math.round(canvas.width * 0.8));
        canvas.height = Math.max(1, Math.round(canvas.height * 0.8));
      }
      if (!compressed || compressed.size > 800 * 1024) throw new Error(currentCopy().photoTooLarge);
      return await encodeImage(compressed);
    } catch (error) {
      if (error instanceof Error && (error.message === currentCopy().photoTooLarge
        || error.message === currentCopy().photoCompressFailed)) throw error;
      throw new Error(currentCopy().photoCompressFailed);
    } finally {
      bitmap?.close();
    }
  }

  function clearPendingImage() {
    if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl);
    pendingImage = null;
    pendingImageUrl = "";
    imageInput.value = "";
    imageThumbnail.removeAttribute("src");
    imageName.textContent = "";
    imagePreview.classList.add("hidden");
  }

  async function sendQuestion(question, imageFile = null) {
    const copyForLanguage = currentCopy();
    const text = question.trim() || (imageFile ? copyForLanguage.imageQuestion : "");
    if ((!text && !imageFile) || isSending) return;
    const endpoint = assistantEndpoint();
    if (!endpoint) {
      setStatus(copyForLanguage.unavailable, true);
      return;
    }

    history.push({ role: "user", text });
    addMessage(
      "user",
      question.trim() || copyForLanguage.photoAttached,
      [],
      imageFile ? URL.createObjectURL(imageFile) : "",
    );
    input.value = "";
    isSending = true;
    sendButton.disabled = true;
    photoButton.disabled = true;
    imageRemoveButton.disabled = true;
    microphoneButton.disabled = true;
    setStatus(copyForLanguage.sending);

    try {
      const image = imageFile ? await prepareImage(imageFile) : null;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: config.supabasePublishableKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ messages: history.slice(-8), ...(image ? { image } : {}) })
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error("RATE_LIMITED");
        const error = await readError(response);
        if (error.code === "SETUP_REQUIRED") throw new Error("SETUP_REQUIRED");
        throw new Error(error.error || error.message || "The assistant request failed.");
      }

      const result = await response.json();
      if (typeof result.reply !== "string" || !result.reply.trim()) throw new Error("The assistant returned an empty reply.");
      history.push({ role: "model", text: result.reply });
      if (history.length > 8) history.splice(0, history.length - 8);
      addMessage("assistant", result.reply, Array.isArray(result.products) ? result.products : []);
      setStatus("");
      speak(result.reply);
      if (imageFile && imageFile === pendingImage) clearPendingImage();
    } catch (error) {
      history.pop();
      const userMessage = error instanceof Error && error.message === "RATE_LIMITED"
        ? copyForLanguage.rateLimited
        : error instanceof Error && error.message === "SETUP_REQUIRED"
          ? copyForLanguage.setupRequired
          : error instanceof TypeError
            ? copyForLanguage.failed
            : error instanceof Error && [copyForLanguage.photoTooLarge, copyForLanguage.photoCompressFailed].includes(error.message)
              ? error.message
              : copyForLanguage.replyFailed;
      addMessage("assistant", userMessage);
      setStatus(userMessage, true);
    } finally {
      isSending = false;
      sendButton.disabled = false;
      photoButton.disabled = false;
      imageRemoveButton.disabled = false;
      microphoneButton.disabled = false;
      input.focus();
    }
  }

  function startListening() {
    if (!Recognition) {
      setStatus(currentCopy().microphoneUnavailable, true);
      return;
    }
    if (isListening) {
      stopListening();
      return;
    }
    recognition = new Recognition();
    recognition.lang = document.documentElement.lang === "te" ? "te-IN" : "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      isListening = true;
      microphoneButton.classList.add("voice-microphone-listening");
      setStatus(currentCopy().listening);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      input.value = transcript.slice(0, 500);
      void sendQuestion(input.value);
    };
    recognition.onerror = () => {
      setStatus(currentCopy().microphoneError, true);
    };
    recognition.onend = () => {
      isListening = false;
      microphoneButton.classList.remove("voice-microphone-listening");
      if (statusElement.textContent === currentCopy().listening) setStatus("");
    };
    try {
      recognition.start();
    } catch (error) {
      isListening = false;
      microphoneButton.classList.remove("voice-microphone-listening");
      setStatus(currentCopy().microphoneError, true);
    }
  }

  launcher.addEventListener("click", () => setOpen(panel.classList.contains("hidden")));
  closeButton.addEventListener("click", () => setOpen(false));
  photoButton.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    const copyForLanguage = currentCopy();
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      clearPendingImage();
      setStatus(copyForLanguage.photoType, true);
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      clearPendingImage();
      setStatus(copyForLanguage.photoSize, true);
      return;
    }
    if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl);
    pendingImage = file;
    pendingImageUrl = URL.createObjectURL(file);
    imageThumbnail.src = pendingImageUrl;
    imageThumbnail.alt = file.name;
    imageName.textContent = file.name || copyForLanguage.photoAttached;
    imagePreview.classList.remove("hidden");
    setStatus("");
  });
  imageRemoveButton.addEventListener("click", () => {
    clearPendingImage();
    setStatus("");
  });
  microphoneButton.addEventListener("click", startListening);
  speechButton.addEventListener("click", () => {
    speakReplies = !speakReplies;
    speechButton.setAttribute("aria-pressed", String(speakReplies));
    const label = speakReplies ? currentCopy().spokenOn : currentCopy().spokenOff;
    speechButton.setAttribute("aria-label", label);
    speechButton.dataset.ariaLabelEn = speakReplies ? copy.en.spokenOn : copy.en.spokenOff;
    speechButton.dataset.ariaLabelTe = speakReplies ? copy.te.spokenOn : copy.te.spokenOff;
    if (!speakReplies) window.speechSynthesis?.cancel();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!input.value.trim() && !pendingImage) {
      setStatus(currentCopy().empty, true);
      input.focus();
      return;
    }
    void sendQuestion(input.value, pendingImage);
  });
  promptButtons.forEach((button) => {
    button.addEventListener("click", () => void sendQuestion(button.textContent, pendingImage));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.classList.contains("hidden")) setOpen(false);
  });
  window.addEventListener("languagechange", () => {
    speechButton.setAttribute("aria-label", speakReplies ? currentCopy().spokenOn : currentCopy().spokenOff);
    if (statusElement.textContent) setStatus("");
    if (!history.length) {
      messagesElement.replaceChildren();
      addMessage("assistant", currentCopy().welcome);
    }
  });

  speechButton.setAttribute("aria-label", currentCopy().spokenOn);
  microphoneButton.disabled = !Recognition;
  speechButton.disabled = !window.speechSynthesis || typeof SpeechSynthesisUtterance !== "function";
  window.addEventListener("beforeunload", () => {
    if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl);
  });
  addMessage("assistant", currentCopy().welcome);
})();
