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

navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navigation.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  });
});

document.querySelector("#current-year").textContent = new Date().getFullYear();

const savedLanguage = localStorage.getItem("svaw-language");
if (savedLanguage === "te") {
  setLanguage("te");
}
