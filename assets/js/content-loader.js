(function () {
  const config = window.APP_CONFIG;

  if (!window.supabase || !config || !config.supabase || !isConfigured()) {
    return;
  }

  const client = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);

  loadPublicContent().catch(function (error) {
    console.warn("Conteudo dinamico indisponivel. Usando fallback local.", error);
  });

  async function loadPublicContent() {
    const [settingsResult, sectionsResult, blocksResult] = await Promise.all([
      client
        .from("site_settings")
        .select("chave,valor")
        .eq("chave", "general")
        .eq("publico", true)
        .maybeSingle(),
      client
        .from("site_sections")
        .select("chave,titulo,subtitulo,conteudo,metadata")
        .in("chave", ["hero", "sobre"])
        .eq("ativo", true),
      client
        .from("site_blocks")
        .select("section_key,tipo,titulo,subtitulo,conteudo,icone,imagem_url,botao_texto,botao_link,ordem,metadata")
        .in("section_key", ["diferenciais", "protocolos", "beneficios", "como_funciona"])
        .eq("ativo", true)
        .order("ordem", { ascending: true })
    ]);

    if (settingsResult.error) {
      throw settingsResult.error;
    }

    if (sectionsResult.error) {
      throw sectionsResult.error;
    }

    if (blocksResult.error) {
      throw blocksResult.error;
    }

    const content = normalizeContent(settingsResult.data, sectionsResult.data || [], blocksResult.data || []);
    applyGeneral(content.general);
    applyTextContent(content);
    applyLinks(content);
    applyBlocks(content.blocks);
    updateExternalLinks();
  }

  function normalizeContent(settings, sections, blocks) {
    const normalized = {
      general: settings && settings.valor ? settings.valor : {},
      hero: {},
      sobre: {},
      blocks: {}
    };

    sections.forEach(function (section) {
      normalized[section.chave] = Object.assign({}, section, section.metadata || {});
    });

    blocks.forEach(function (block) {
      if (!normalized.blocks[block.section_key]) {
        normalized.blocks[block.section_key] = [];
      }

      normalized.blocks[block.section_key].push(block);
    });

    normalized.general.instagramLabel = normalized.general.instagram
      ? `Instagram @${String(normalized.general.instagram).replace(/^@/, "")}`
      : "";

    return normalized;
  }

  function applyGeneral(general) {
    if (!general) return;

    if (general.whatsapp) {
      config.profissional.whatsapp = sanitizePhone(general.whatsapp);
    }

    if (general.instagram) {
      config.profissional.instagram = String(general.instagram).replace(/^@/, "");
    }

    if (general.email) {
      config.profissional.email = general.email;
    }
  }

  function applyTextContent(content) {
    document.querySelectorAll("[data-cms]").forEach(function (element) {
      const value = getPath(content, element.getAttribute("data-cms"));
      if (value) {
        element.textContent = value;
      }
    });

    document.querySelectorAll("[data-cms-rich]").forEach(function (element) {
      const value = getPath(content, element.getAttribute("data-cms-rich"));
      if (value) {
        renderParagraphs(element, value);
      }
    });
  }

  function applyLinks(content) {
    document.querySelectorAll("[data-cms-href]").forEach(function (element) {
      const value = getPath(content, element.getAttribute("data-cms-href"));

      if (!value) return;

      if (value === "whatsapp") {
        element.href = buildWhatsAppUrl();
        return;
      }

      element.href = value;
    });
  }

  function applyBlocks(blocksBySection) {
    if (!blocksBySection) return;

    Object.keys(blocksBySection).forEach(function (sectionKey) {
      const container = document.querySelector(`[data-cms-blocks="${sectionKey}"]`);
      const blocks = blocksBySection[sectionKey] || [];

      if (!container || !blocks.length) return;

      container.textContent = "";
      blocks.forEach(function (block, index) {
        container.appendChild(createBlockElement(sectionKey, block, index));
      });
    });
  }

  function createBlockElement(sectionKey, block, index) {
    if (sectionKey === "beneficios") {
      return createBenefitCard(block, index);
    }

    if (sectionKey === "como_funciona") {
      return createStep(block, index);
    }

    return createTag(block);
  }

  function createTag(block) {
    const span = document.createElement("span");
    span.textContent = block.titulo || block.conteudo || "";
    return span;
  }

  function createBenefitCard(block, index) {
    const article = document.createElement("article");
    article.className = "benefit-card reveal is-visible";

    const icon = document.createElement("span");
    icon.className = "card-icon";
    icon.textContent = block.icone || String(index + 1).padStart(2, "0");

    const title = document.createElement("h3");
    title.textContent = block.titulo || "";

    const text = document.createElement("p");
    text.textContent = block.conteudo || block.subtitulo || "";

    article.append(icon, title, text);
    return article;
  }

  function createStep(block, index) {
    const item = document.createElement("li");
    item.className = "reveal is-visible";

    const marker = document.createElement("span");
    marker.textContent = block.icone || String(index + 1);

    const content = document.createElement("div");
    const title = document.createElement("h3");
    const text = document.createElement("p");

    title.textContent = block.titulo || "";
    text.textContent = block.conteudo || block.subtitulo || "";
    content.append(title, text);
    item.append(marker, content);

    return item;
  }

  function updateExternalLinks() {
    const whatsappUrl = buildWhatsAppUrl();
    const instagramUrl = `https://www.instagram.com/${config.profissional.instagram}/`;

    document.querySelectorAll(".js-whatsapp-link").forEach(function (link) {
      link.href = whatsappUrl;
    });

    document.querySelectorAll(".js-instagram-link").forEach(function (link) {
      link.href = instagramUrl;
    });
  }

  function renderParagraphs(element, text) {
    element.textContent = "";
    String(text)
      .split(/\n{2,}/)
      .map(function (paragraph) {
        return paragraph.trim();
      })
      .filter(Boolean)
      .forEach(function (paragraph) {
        const p = document.createElement("p");
        p.textContent = paragraph;
        element.appendChild(p);
      });
  }

  function getPath(source, path) {
    return String(path || "")
      .split(".")
      .reduce(function (current, key) {
        return current && current[key] != null ? current[key] : "";
      }, source);
  }

  function sanitizePhone(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function isConfigured() {
    return Boolean(
      config.supabase.url &&
      config.supabase.anonKey &&
      !config.supabase.url.includes("SEU-PROJETO") &&
      !config.supabase.anonKey.includes("SUA_SUPABASE")
    );
  }

  function buildWhatsAppUrl() {
    const message = encodeURIComponent(config.textos.chamadaWhatsApp);
    return `https://wa.me/${config.profissional.whatsapp}?text=${message}`;
  }
})();
