const languageToggle = document.querySelector("#language-toggle");
const menuToggle = document.querySelector("#menu-toggle");
const navigation = document.querySelector(".main-nav");

function setLanguage(language) {
  const isTelugu = language === "te";
  document.documentElement.lang = isTelugu ? "te" : "en";
  document.body.classList.toggle("telugu", isTelugu);

  document.querySelectorAll("[data-en][data-te]").forEach((element) => {
    element.innerHTML = element.dataset[isTelugu ? "te" : "en"];
  });
  document.querySelectorAll("[data-placeholder-en][data-placeholder-te]").forEach((element) => {
    element.placeholder = element.dataset[isTelugu ? "placeholderTe" : "placeholderEn"];
  });
  document.querySelectorAll("[data-aria-label-en][data-aria-label-te]").forEach((element) => {
    element.setAttribute("aria-label", element.dataset[isTelugu ? "ariaLabelTe" : "ariaLabelEn"]);
  });
  document.querySelectorAll("[data-alt-en][data-alt-te]").forEach((element) => {
    element.alt = element.dataset[isTelugu ? "altTe" : "altEn"];
  });

  languageToggle.textContent = isTelugu ? "English" : "తెలుగు";
  languageToggle.setAttribute(
    "aria-label",
    isTelugu ? "Switch language to English" : "భాషను తెలుగుకు మార్చండి"
  );
  localStorage.setItem("svaw-language", language);
  window.dispatchEvent(new Event("languagechange"));
}

languageToggle.addEventListener("click", () => {
  setLanguage(document.documentElement.lang === "en" ? "te" : "en");
});

menuToggle.addEventListener("click", () => {
  const isOpen = navigation.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !navigation.classList.contains("open")) return;

  navigation.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
  menuToggle.focus();
});

navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navigation.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  });
});

document.querySelector("#current-year").textContent = new Date().getFullYear();

const photoViewer = document.querySelector("#photo-viewer");
const photoViewerImage = document.querySelector("#photo-viewer-image");
const photoViewerCaption = document.querySelector("#photo-viewer-caption");

document.querySelectorAll(".photo-open").forEach((button) => {
  button.addEventListener("click", () => {
    const image = button.querySelector("img");
    const caption = button.closest("figure")?.querySelector("figcaption");
    if (!image || !caption) return;

    photoViewerImage.src = image.currentSrc || image.src;
    photoViewerImage.alt = image.alt;
    photoViewerCaption.textContent = caption.textContent.trim();
    photoViewer.showModal();
  });
});

photoViewer.addEventListener("click", (event) => {
  if (event.target === photoViewer) photoViewer.close();
});

photoViewer.addEventListener("cancel", (event) => {
  event.preventDefault();
  photoViewer.close();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && photoViewer.open) photoViewer.close();
});

const savedLanguage = localStorage.getItem("svaw-language");
if (savedLanguage === "te") {
  setLanguage("te");
}
