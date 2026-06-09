(function () {
  const loginView = document.querySelector("#login-view");
  const panelView = document.querySelector("#panel-view");
  const loginForm = document.querySelector("#login-form");
  const contentForm = document.querySelector("#content-form");
  const loginFeedback = document.querySelector("#login-feedback");
  const contentFeedback = document.querySelector("#content-feedback");
  const logoutButton = document.querySelector("#logout-button");
  const loginButton = document.querySelector("#login-button");
  const saveButton = document.querySelector("#save-button");
  const blockSectionFilter = document.querySelector("#block-section-filter");
  const blocksList = document.querySelector("#blocks-list");
  const blockForm = document.querySelector("#block-form");
  const blocksFeedback = document.querySelector("#blocks-feedback");
  const mediaGrid = document.querySelector("#media-grid");
  const mediaFeedback = document.querySelector("#media-feedback");
  const newBlockButton = document.querySelector("#new-block-button");
  const cancelBlockButton = document.querySelector("#cancel-block-button");
  const saveBlockButton = document.querySelector("#save-block-button");
  const userLabel = document.querySelector("#admin-user-label");
  const roleLabel = document.querySelector("#admin-role");
  const loadedAtLabel = document.querySelector("#admin-loaded-at");

  let client;
  let authorizedAdmin;
  let currentContent;
  let currentBlocks = [];
  let currentAssets = [];
  const mediaItems = [
    {
      key: "header_logo",
      label: "Logo do header",
      description: "Usada no topo do site, dentro do menu principal.",
      fallback: "assets/img/brand/logo-glaubert-couto-horizontal.png",
      type: "logo"
    },
    {
      key: "footer_logo",
      label: "Logo do footer",
      description: "Usada no rodape do site.",
      fallback: "assets/img/brand/logo-glaubert-couto-horizontal.png",
      type: "logo"
    },
    {
      key: "favicon",
      label: "Favicon",
      description: "Icone exibido na aba do navegador e atalhos.",
      fallback: "assets/img/favicon/favicon.png",
      type: "favicon"
    },
    {
      key: "hero_image",
      label: "Imagem principal do Hero",
      description: "Foto principal exibida na primeira dobra do site.",
      fallback: "assets/img/glaubert-couto.png",
      type: "image"
    },
    {
      key: "about_image",
      label: "Imagem da secao Sobre",
      description: "Imagem opcional exibida abaixo do texto da secao Sobre.",
      fallback: "assets/img/glaubert-couto.png",
      type: "image"
    },
    {
      key: "og_image",
      label: "Open Graph image",
      description: "Imagem usada no compartilhamento do link em redes sociais.",
      fallback: "assets/img/glaubert-couto.png",
      type: "social"
    }
  ];

  init();

  async function init() {
    try {
      client = window.AdminAuth.createAdminClient();
      authorizedAdmin = await window.AdminAuth.getAuthorizedAdmin(client);

      if (!authorizedAdmin) {
        showLogin();
        return;
      }

      await showPanel();
    } catch (error) {
      showLogin();
      setFeedback(loginFeedback, error.message || "Nao foi possivel iniciar o painel.", "error");
    }
  }

  async function showPanel() {
    loginView.classList.add("is-hidden");
    panelView.classList.remove("is-hidden");
    userLabel.textContent = authorizedAdmin.admin.nome || authorizedAdmin.admin.email;
    roleLabel.textContent = authorizedAdmin.admin.role;

    if (!authorizedAdmin.canEdit) {
      saveButton.disabled = true;
      saveBlockButton.disabled = true;
      newBlockButton.disabled = true;
      setFeedback(contentFeedback, "Seu usuario pode visualizar, mas nao editar conteudo.", "error");
      setFeedback(blocksFeedback, "Seu usuario pode visualizar, mas nao editar blocos.", "error");
      setFeedback(mediaFeedback, "Seu usuario pode visualizar, mas nao enviar imagens.", "error");
    }

    await loadAndFill();

    try {
      await loadBlocksAndRender();
      resetBlockForm();
    } catch (error) {
      setFeedback(blocksFeedback, error.message || "Nao foi possivel carregar blocos.", "error");
    }

    try {
      await loadAssetsAndRender();
    } catch (error) {
      renderMediaCards();
      setFeedback(mediaFeedback, error.message || "Nao foi possivel carregar imagens.", "error");
    }
  }

  function showLogin() {
    panelView.classList.add("is-hidden");
    loginView.classList.remove("is-hidden");
  }

  async function loadAndFill() {
    currentContent = await window.AdminContent.loadContent(client);
    window.AdminContent.fillForm(contentForm, currentContent);
    loadedAtLabel.textContent = currentContent.loadedAt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  async function loadBlocksAndRender() {
    currentBlocks = await window.AdminContent.loadBlocks(client);
    renderBlocksList();
  }

  async function loadAssetsAndRender() {
    currentAssets = await window.AdminContent.loadAssets(client);
    renderMediaCards();
  }

  function renderBlocksList() {
    const selectedSection = blockSectionFilter.value;
    const blocks = currentBlocks.filter(function (block) {
      return block.section_key === selectedSection;
    });

    blocksList.textContent = "";

    if (!blocks.length) {
      const empty = document.createElement("p");
      empty.className = "block-item-content";
      empty.textContent = "Nenhum item cadastrado nesta secao.";
      blocksList.appendChild(empty);
      return;
    }

    blocks.forEach(function (block) {
      blocksList.appendChild(createBlockListItem(block));
    });
  }

  function createBlockListItem(block) {
    const item = document.createElement("article");
    item.className = `block-item ${block.ativo ? "" : "is-inactive"}`.trim();

    const header = document.createElement("div");
    header.className = "block-item-header";

    const title = document.createElement("p");
    title.className = "block-item-title";
    title.textContent = block.titulo || "Sem titulo";

    const meta = document.createElement("p");
    meta.className = "block-item-meta";
    meta.textContent = `Ordem ${block.ordem} | ${block.tipo} | ${block.ativo ? "Ativo" : "Inativo"}`;

    header.append(title, meta);

    const content = document.createElement("p");
    content.className = "block-item-content";
    content.textContent = block.conteudo || block.subtitulo || "";

    const actions = document.createElement("div");
    actions.className = "block-item-actions";

    const editButton = document.createElement("button");
    editButton.className = "ghost-button";
    editButton.type = "button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", function () {
      fillBlockForm(block);
    });

    const toggleButton = document.createElement("button");
    toggleButton.className = "ghost-button";
    toggleButton.type = "button";
    toggleButton.textContent = block.ativo ? "Desativar" : "Ativar";
    toggleButton.disabled = !authorizedAdmin.canEdit;
    toggleButton.addEventListener("click", async function () {
      await handleToggleBlock(block);
    });

    actions.append(editButton, toggleButton);
    item.append(header, content, actions);
    return item;
  }

  function fillBlockForm(block) {
    blockForm.elements.id.value = block.id || "";
    blockForm.elements.section_key.value = block.section_key || blockSectionFilter.value;
    blockForm.elements.tipo.value = block.tipo || "card";
    blockForm.elements.titulo.value = block.titulo || "";
    blockForm.elements.subtitulo.value = block.subtitulo || "";
    blockForm.elements.conteudo.value = block.conteudo || "";
    blockForm.elements.icone.value = block.icone || "";
    blockForm.elements.imagem_url.value = block.imagem_url || "";
    blockForm.elements.botao_texto.value = block.botao_texto || "";
    blockForm.elements.botao_link.value = block.botao_link || "";
    blockForm.elements.ordem.value = block.ordem || 0;
    blockForm.elements.ativo.checked = block.ativo !== false;
    setFeedback(blocksFeedback, "Editando item existente.", "");
  }

  function resetBlockForm() {
    blockForm.reset();
    blockForm.elements.id.value = "";
    blockForm.elements.section_key.value = blockSectionFilter.value;
    blockForm.elements.tipo.value = defaultTypeForSection(blockSectionFilter.value);
    blockForm.elements.ordem.value = nextOrderForSection(blockSectionFilter.value);
    blockForm.elements.ativo.checked = true;
    setFeedback(blocksFeedback, "", "");
  }

  function defaultTypeForSection(sectionKey) {
    if (sectionKey === "como_funciona") return "step";
    if (sectionKey === "protocolos" || sectionKey === "diferenciais") return "tag";
    return "card";
  }

  function nextOrderForSection(sectionKey) {
    const orders = currentBlocks
      .filter(function (block) {
        return block.section_key === sectionKey;
      })
      .map(function (block) {
        return Number(block.ordem) || 0;
      });

    return orders.length ? Math.max.apply(null, orders) + 1 : 1;
  }

  function renderMediaCards() {
    mediaGrid.textContent = "";
    mediaItems.forEach(function (item) {
      mediaGrid.appendChild(createMediaCard(item));
    });
  }

  function createMediaCard(item) {
    const asset = getAsset(item.key);
    const card = document.createElement("article");
    card.className = "media-card";

    const header = document.createElement("div");
    header.className = "media-card-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    const description = document.createElement("p");
    title.textContent = item.label;
    description.textContent = item.description;
    titleWrap.append(title, description);

    const status = document.createElement("p");
    status.textContent = asset ? "Supabase" : "Fallback local";
    header.append(titleWrap, status);

    const previews = document.createElement("div");
    previews.className = "media-preview-grid";

    const currentPreview = createPreview("Atual", asset ? asset.url : item.fallback);
    const newPreview = createPreview("Nova", "");
    previews.append(currentPreview.wrapper, newPreview.wrapper);

    const actions = document.createElement("div");
    actions.className = "media-actions";

    const fileInput = document.createElement("input");
    fileInput.className = "media-file";
    fileInput.type = "file";
    fileInput.accept = ".jpg,.jpeg,.png,.webp,.ico,image/jpeg,image/png,image/webp,image/x-icon";
    fileInput.disabled = !authorizedAdmin.canEdit;

    const row = document.createElement("div");
    row.className = "media-actions-row";

    const uploadButton = document.createElement("button");
    uploadButton.className = "admin-button";
    uploadButton.type = "button";
    uploadButton.textContent = "Enviar imagem";
    uploadButton.disabled = !authorizedAdmin.canEdit;

    fileInput.addEventListener("change", function () {
      const file = fileInput.files[0];
      if (!file) return;

      try {
        window.AdminContent.validateAssetFile(file);
        newPreview.image.src = URL.createObjectURL(file);
        newPreview.image.hidden = false;
        setFeedback(mediaFeedback, "Preview carregado. Clique em Enviar imagem para salvar.", "");
      } catch (error) {
        fileInput.value = "";
        newPreview.image.hidden = true;
        setFeedback(mediaFeedback, error.message, "error");
      }
    });

    uploadButton.addEventListener("click", async function () {
      const file = fileInput.files[0];

      if (!file) {
        setFeedback(mediaFeedback, "Selecione uma imagem antes de enviar.", "error");
        return;
      }

      await handleUploadAsset(item, file, uploadButton, fileInput);
    });

    row.append(uploadButton);
    actions.append(fileInput, row);
    card.append(header, previews, actions);
    return card;
  }

  function createPreview(label, src) {
    const wrapper = document.createElement("div");
    wrapper.className = "media-preview";

    const caption = document.createElement("span");
    caption.textContent = label;

    const frame = document.createElement("div");
    frame.className = "media-preview-frame";

    const image = document.createElement("img");
    image.alt = label;
    image.hidden = !src;

    if (src) {
      image.src = src;
    }

    frame.appendChild(image);
    wrapper.append(caption, frame);

    return { wrapper, image };
  }

  function getAsset(key) {
    return currentAssets.find(function (asset) {
      return asset.chave === key && asset.ativo !== false;
    });
  }

  async function handleUploadAsset(item, file, button, fileInput) {
    if (!authorizedAdmin || !authorizedAdmin.canEdit) {
      setFeedback(mediaFeedback, "Voce nao tem permissao para enviar imagens.", "error");
      return;
    }

    button.disabled = true;
    button.textContent = "Enviando...";
    setFeedback(mediaFeedback, `Enviando ${item.label}...`, "");

    try {
      currentAssets = await window.AdminContent.uploadAsset(
        client,
        item,
        file,
        authorizedAdmin.session.user.id
      );
      fileInput.value = "";
      renderMediaCards();
      setFeedback(mediaFeedback, "Imagem salva com sucesso.", "success");
    } catch (error) {
      setFeedback(mediaFeedback, error.message || "Nao foi possivel enviar a imagem.", "error");
    } finally {
      button.disabled = !authorizedAdmin.canEdit;
      button.textContent = "Enviar imagem";
    }
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    loginButton.disabled = true;
    setFeedback(loginFeedback, "Validando acesso...", "");

    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    try {
      authorizedAdmin = await window.AdminAuth.signIn(client, email, password);

      if (!authorizedAdmin) {
        setFeedback(loginFeedback, "Usuario autenticado, mas sem permissao administrativa.", "error");
        return;
      }

      await showPanel();
    } catch (error) {
      setFeedback(loginFeedback, error.message || "Falha no login.", "error");
    } finally {
      loginButton.disabled = false;
    }
  });

  contentForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!authorizedAdmin || !authorizedAdmin.canEdit) {
      setFeedback(contentFeedback, "Voce nao tem permissao para editar.", "error");
      return;
    }

    saveButton.disabled = true;
    setFeedback(contentFeedback, "Salvando conteudo...", "");

    try {
      currentContent = await window.AdminContent.saveContent(client, contentForm, currentContent);
      window.AdminContent.fillForm(contentForm, currentContent);
      setFeedback(contentFeedback, "Conteudo salvo com sucesso.", "success");
      loadedAtLabel.textContent = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      setFeedback(contentFeedback, error.message || "Nao foi possivel salvar.", "error");
    } finally {
      saveButton.disabled = false;
    }
  });

  blockSectionFilter.addEventListener("change", function () {
    renderBlocksList();
    resetBlockForm();
  });

  newBlockButton.addEventListener("click", function () {
    resetBlockForm();
    blockForm.elements.titulo.focus();
  });

  cancelBlockButton.addEventListener("click", function () {
    resetBlockForm();
  });

  blockForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!authorizedAdmin || !authorizedAdmin.canEdit) {
      setFeedback(blocksFeedback, "Voce nao tem permissao para editar blocos.", "error");
      return;
    }

    saveBlockButton.disabled = true;
    setFeedback(blocksFeedback, "Salvando item...", "");

    try {
      currentBlocks = await window.AdminContent.saveBlock(
        client,
        blockForm,
        authorizedAdmin.session.user.id
      );
      renderBlocksList();
      resetBlockForm();
      setFeedback(blocksFeedback, "Item salvo com sucesso.", "success");
    } catch (error) {
      setFeedback(blocksFeedback, error.message || "Nao foi possivel salvar o item.", "error");
    } finally {
      saveBlockButton.disabled = !authorizedAdmin.canEdit;
    }
  });

  async function handleToggleBlock(block) {
    if (!authorizedAdmin || !authorizedAdmin.canEdit) {
      setFeedback(blocksFeedback, "Voce nao tem permissao para alterar blocos.", "error");
      return;
    }

    setFeedback(blocksFeedback, "Atualizando item...", "");

    try {
      currentBlocks = await window.AdminContent.toggleBlock(
        client,
        block,
        authorizedAdmin.session.user.id
      );
      renderBlocksList();
      setFeedback(blocksFeedback, block.ativo ? "Item desativado." : "Item ativado.", "success");
    } catch (error) {
      setFeedback(blocksFeedback, error.message || "Nao foi possivel atualizar o item.", "error");
    }
  }

  logoutButton.addEventListener("click", async function () {
    await window.AdminAuth.signOut(client);
    authorizedAdmin = null;
    currentContent = null;
    loginForm.reset();
    showLogin();
  });

  document.querySelectorAll(".sidebar a").forEach(function (link) {
    link.addEventListener("click", function () {
      document.querySelectorAll(".sidebar a").forEach(function (item) {
        item.classList.remove("is-active");
      });
      link.classList.add("is-active");
    });
  });

  function setFeedback(element, message, type) {
    element.textContent = message;
    element.className = `admin-feedback ${type || ""}`.trim();
  }
})();
