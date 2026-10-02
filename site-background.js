(() => {
  "use strict";

  const config = window.MTNAIDU_CONFIG || {};
  const hero = document.querySelector(".hero");
  if (!hero || !config.supabaseUrl || !config.supabasePublishableKey) return;

  const baseUrl = config.supabaseUrl.replace(/\/+$/, "");
  const headers = {
    apikey: config.supabasePublishableKey,
    Authorization: `Bearer ${config.supabasePublishableKey}`
  };

  fetch(`${baseUrl}/rest/v1/site_settings?select=value&key=eq.hero_background_path&limit=1`, { headers })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Could not load the hero background (${response.status}).`);
      return response.json();
    })
    .then((settings) => {
      const path = settings[0]?.value;
      if (typeof path !== "string" || !path) return;

      const bucket = encodeURIComponent(config.productImageBucket || "product-images");
      const encodedPath = path.split("/").map((part) => encodeURIComponent(part)).join("/");
      const imageUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
      hero.style.backgroundImage = `linear-gradient(rgba(10, 20, 31, .73), rgba(10, 20, 31, .76)), url("${imageUrl}")`;
      hero.classList.add("has-background");
    })
    .catch((error) => {
      console.error("The website hero background could not be loaded.", error);
    });
})();
