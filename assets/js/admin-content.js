(function () {
  const DEFAULT_GENERAL = {
    whatsapp: "",
    instagram: "",
    email: "",
    footerText: ""
  };

  async function loadContent(client) {
    const [settingsResult, sectionsResult] = await Promise.all([
      client
        .from("site_settings")
        .select("chave,valor,tipo,publico,atualizado_em")
        .eq("chave", "general")
        .maybeSingle(),
      client
        .from("site_sections")
        .select("id,chave,nome,titulo,subtitulo,conteudo,metadata,ativo,ordem,atualizado_em")
        .in("chave", ["hero", "sobre"])
    ]);

    if (settingsResult.error) {
      throw settingsResult.error;
    }

    if (sectionsResult.error) {
      throw sectionsResult.error;
    }

    const sections = {};
    (sectionsResult.data || []).forEach(function (section) {
      sections[section.chave] = section;
    });

    return {
      general: Object.assign({}, DEFAULT_GENERAL, settingsResult.data ? settingsResult.data.valor : {}),
      sections,
      loadedAt: new Date()
    };
  }

  async function saveContent(client, form, currentContent) {
    const formData = new FormData(form);
    const currentHero = currentContent.sections.hero || {};
    const currentAbout = currentContent.sections.sobre || {};
    const currentGeneral = currentContent.general || {};

    const heroMetadata = Object.assign({}, currentHero.metadata || {}, {
      primaryButtonText: getValue(formData, "hero_primary_button_text"),
      primaryButtonLink: getValue(formData, "hero_primary_button_link"),
      secondaryButtonText: getValue(formData, "hero_secondary_button_text"),
      secondaryButtonLink: getValue(formData, "hero_secondary_button_link")
    });

    const general = Object.assign({}, currentGeneral, {
      whatsapp: getValue(formData, "whatsapp"),
      instagram: getValue(formData, "instagram"),
      email: getValue(formData, "email"),
      footerText: getValue(formData, "footer_text")
    });

    const updates = [
      client
        .from("site_settings")
        .upsert({
          chave: "general",
          valor: general,
          tipo: "json",
          publico: true,
          atualizado_em: new Date().toISOString()
        }, { onConflict: "chave" }),
      client
        .from("site_sections")
        .upsert({
          chave: "hero",
          nome: "Hero principal",
          titulo: getValue(formData, "hero_title"),
          subtitulo: getValue(formData, "hero_subtitle"),
          conteudo: getValue(formData, "hero_content"),
          ativo: true,
          ordem: 1,
          metadata: heroMetadata,
          atualizado_em: new Date().toISOString()
        }, { onConflict: "chave" }),
      client
        .from("site_sections")
        .upsert({
          chave: "sobre",
          nome: "Sobre",
          titulo: getValue(formData, "about_title"),
          subtitulo: getValue(formData, "about_subtitle"),
          conteudo: getValue(formData, "about_content"),
          ativo: true,
          ordem: 2,
          metadata: currentAbout.metadata || {},
          atualizado_em: new Date().toISOString()
        }, { onConflict: "chave" })
    ];

    const results = await Promise.all(updates);
    const failed = results.find(function (result) {
      return result.error;
    });

    if (failed) {
      throw failed.error;
    }

    return loadContent(client);
  }

  function fillForm(form, content) {
    const hero = content.sections.hero || {};
    const about = content.sections.sobre || {};
    const general = content.general || {};
    const heroMetadata = hero.metadata || {};

    setValue(form, "hero_subtitle", hero.subtitulo);
    setValue(form, "hero_title", hero.titulo);
    setValue(form, "hero_content", hero.conteudo);
    setValue(form, "hero_primary_button_text", heroMetadata.primaryButtonText);
    setValue(form, "hero_primary_button_link", heroMetadata.primaryButtonLink);
    setValue(form, "hero_secondary_button_text", heroMetadata.secondaryButtonText);
    setValue(form, "hero_secondary_button_link", heroMetadata.secondaryButtonLink);
    setValue(form, "about_subtitle", about.subtitulo);
    setValue(form, "about_title", about.titulo);
    setValue(form, "about_content", about.conteudo);
    setValue(form, "whatsapp", general.whatsapp);
    setValue(form, "instagram", general.instagram);
    setValue(form, "email", general.email);
    setValue(form, "footer_text", general.footerText);
  }

  function getValue(formData, field) {
    return String(formData.get(field) || "").trim();
  }

  function setValue(form, field, value) {
    const input = form.elements[field];
    if (input) {
      input.value = value || "";
    }
  }

  window.AdminContent = {
    loadContent,
    saveContent,
    fillForm
  };
})();
