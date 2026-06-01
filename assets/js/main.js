(function () {
  const config = window.APP_CONFIG;
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelectorAll(".nav-links a");
  const whatsappLinks = document.querySelectorAll(".js-whatsapp-link");
  const instagramLinks = document.querySelectorAll(".js-instagram-link");
  const whatsappAnimations = document.querySelectorAll("[data-lottie-whatsapp]");
  const whatsappFloatAnimations = document.querySelectorAll("[data-lottie-whatsapp-float]");
  const instagramAnimations = document.querySelectorAll("[data-lottie-instagram]");
  const revealItems = document.querySelectorAll(".reveal");

  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    }
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      setMenu(!document.body.classList.contains("menu-open"));
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      setMenu(false);
    });
  });

  // Preenche links externos a partir do config.js para facilitar manutenção.
  whatsappLinks.forEach(function (link) {
    const message = encodeURIComponent(config.textos.chamadaWhatsApp);
    link.href = `https://wa.me/${config.profissional.whatsapp}?text=${message}`;
  });

  instagramLinks.forEach(function (link) {
    link.href = `https://www.instagram.com/${config.profissional.instagram}/`;
  });

  if (window.lottie) {
    whatsappAnimations.forEach(function (container) {
      window.lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "assets/lottie/whatsapp.json"
      });
    });

    whatsappFloatAnimations.forEach(function (container) {
      window.lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "assets/lottie/whatsapp-float.json"
      });
    });

    instagramAnimations.forEach(function (container) {
      window.lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "assets/lottie/instagram.json"
      });
    });
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16 });

    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }
})();
