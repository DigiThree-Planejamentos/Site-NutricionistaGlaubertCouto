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

  async function loadBlocks(client) {
    const { data, error } = await client
      .from("site_blocks")
      .select("id,section_key,tipo,titulo,subtitulo,conteudo,icone,imagem_url,botao_texto,botao_link,ordem,ativo,metadata,atualizado_em")
      .order("section_key", { ascending: true })
      .order("ordem", { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function saveBlock(client, form, userId) {
    const formData = new FormData(form);
    const id = getValue(formData, "id");
    const payload = {
      section_key: getValue(formData, "section_key"),
      tipo: getValue(formData, "tipo") || "card",
      titulo: getValue(formData, "titulo"),
      subtitulo: getOptionalValue(formData, "subtitulo"),
      conteudo: getOptionalValue(formData, "conteudo"),
      icone: getOptionalValue(formData, "icone"),
      imagem_url: getOptionalValue(formData, "imagem_url"),
      botao_texto: getOptionalValue(formData, "botao_texto"),
      botao_link: getOptionalValue(formData, "botao_link"),
      ordem: Number(getValue(formData, "ordem") || 0),
      ativo: formData.get("ativo") === "on",
      metadata: {},
      atualizado_em: new Date().toISOString(),
      atualizado_por: userId || null
    };

    if (!payload.section_key) {
      throw new Error("Selecione a secao do bloco.");
    }

    if (!payload.titulo) {
      throw new Error("Informe o titulo do bloco.");
    }

    const query = id
      ? client.from("site_blocks").update(payload).eq("id", id)
      : client.from("site_blocks").insert([payload]);

    const { error } = await query;

    if (error) {
      throw error;
    }

    return loadBlocks(client);
  }

  async function toggleBlock(client, block, userId) {
    const { error } = await client
      .from("site_blocks")
      .update({
        ativo: !block.ativo,
        atualizado_em: new Date().toISOString(),
        atualizado_por: userId || null
      })
      .eq("id", block.id);

    if (error) {
      throw error;
    }

    return loadBlocks(client);
  }

  async function loadAssets(client) {
    const { data, error } = await client
      .from("site_assets")
      .select("id,chave,nome,url,bucket,path,tipo,mime_type,tamanho,ativo,criado_em,atualizado_em")
      .order("chave", { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function uploadAsset(client, assetConfig, file, userId) {
    validateAssetFile(file);

    const path = buildAssetPath(assetConfig.key, file.name);
    const { error: uploadError } = await client.storage
      .from("site-assets")
      .upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type || getMimeTypeFromName(file.name)
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = client.storage
      .from("site-assets")
      .getPublicUrl(path);

    const publicUrl = data.publicUrl;
    const payload = {
      chave: assetConfig.key,
      nome: assetConfig.label,
      url: publicUrl,
      bucket: "site-assets",
      path,
      tipo: assetConfig.type,
      mime_type: file.type || getMimeTypeFromName(file.name),
      tamanho: file.size,
      ativo: true,
      atualizado_em: new Date().toISOString(),
      atualizado_por: userId || null
    };

    const existing = await getAssetByKey(client, assetConfig.key);
    const query = existing
      ? client.from("site_assets").update(payload).eq("chave", assetConfig.key)
      : client.from("site_assets").insert([Object.assign({}, payload, {
        criado_por: userId || null
      })]);

    const { error: saveError } = await query;

    if (saveError) {
      throw saveError;
    }

    return loadAssets(client);
  }

  async function getAssetByKey(client, key) {
    const { data, error } = await client
      .from("site_assets")
      .select("id")
      .eq("chave", key)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  function validateAssetFile(file) {
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "ico"];
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/x-icon",
      "image/vnd.microsoft.icon"
    ];
    const extension = getFileExtension(file.name);
    const mimeType = file.type || getMimeTypeFromName(file.name);

    if (!allowedExtensions.includes(extension)) {
      throw new Error("Formato invalido. Use jpg, jpeg, png, webp ou ico.");
    }

    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error("Tipo de arquivo invalido. SVG nao e permitido nesta fase.");
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error("Arquivo muito grande. O limite e 2 MB.");
    }
  }

  function buildAssetPath(key, fileName) {
    const extension = getFileExtension(fileName);
    const baseName = normalizeFileName(fileName.replace(/\.[^.]+$/, ""));
    return `${key}/${Date.now()}-${baseName}.${extension}`;
  }

  function normalizeFileName(value) {
    return String(value || "imagem")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "imagem";
  }

  function getFileExtension(fileName) {
    return String(fileName || "")
      .split(".")
      .pop()
      .toLowerCase();
  }

  function getMimeTypeFromName(fileName) {
    const extension = getFileExtension(fileName);

    if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
    if (extension === "png") return "image/png";
    if (extension === "webp") return "image/webp";
    if (extension === "ico") return "image/x-icon";
    return "";
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

  function getOptionalValue(formData, field) {
    const value = getValue(formData, field);
    return value || null;
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
    fillForm,
    loadBlocks,
    saveBlock,
    toggleBlock,
    loadAssets,
    uploadAsset,
    validateAssetFile
  };
})();
