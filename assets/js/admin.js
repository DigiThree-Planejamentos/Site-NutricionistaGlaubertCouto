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
  const userLabel = document.querySelector("#admin-user-label");
  const roleLabel = document.querySelector("#admin-role");
  const loadedAtLabel = document.querySelector("#admin-loaded-at");

  let client;
  let authorizedAdmin;
  let currentContent;

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
      setFeedback(contentFeedback, "Seu usuario pode visualizar, mas nao editar conteudo.", "error");
    }

    await loadAndFill();
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
