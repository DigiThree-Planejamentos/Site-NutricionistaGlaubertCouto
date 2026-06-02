(function () {
  const form = document.querySelector("#lead-form");
  const feedback = document.querySelector("#form-feedback");
  const config = window.APP_CONFIG;

  if (!form) return;

  function getValue(formData, field) {
    return String(formData.get(field) || "").trim();
  }

  function getOptionalValue(formData, field) {
    const value = getValue(formData, field);
    return value || null;
  }

  function displayValue(value) {
    return value || "Não informado";
  }

  function setFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = `form-feedback ${type || ""}`.trim();
  }

  function validateLead(lead) {
    const phoneDigits = lead.whatsapp.replace(/\D/g, "");

    if (!lead.nome) return "Informe seu nome completo.";
    if (!lead.whatsapp) return "Informe seu WhatsApp.";
    if (phoneDigits.length < 10) return "Informe um WhatsApp válido, com DDD.";
    if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return "Informe um e-mail válido ou deixe o campo em branco.";
    if (!lead.objetivo) return "Selecione seu principal objetivo.";
    if (!lead.consentimento_lgpd) return "Para enviar, marque a autorização de armazenamento dos dados.";
    return "";
  }

  function buildLeadPayload(formData) {
    return {
      nome: getValue(formData, "nome"),
      whatsapp: getValue(formData, "whatsapp"),
      email: getOptionalValue(formData, "email"),
      cidade: getOptionalValue(formData, "cidade"),
      bairro: getOptionalValue(formData, "bairro"),
      objetivo: getValue(formData, "objetivo"),
      acompanhamento_atual: getOptionalValue(formData, "acompanhamento_atual"),
      restricao_alimentar: getOptionalValue(formData, "restricao_alimentar"),
      condicao_saude: getOptionalValue(formData, "condicao_saude"),
      rotina_alimentar: getOptionalValue(formData, "rotina_alimentar"),
      preferencia_atendimento: getOptionalValue(formData, "preferencia_atendimento"),
      melhor_horario: getOptionalValue(formData, "melhor_horario"),
      mensagem_adicional: getOptionalValue(formData, "mensagem_adicional"),
      consentimento_lgpd: formData.get("consentimento_lgpd") === "on"
    };
  }

  function buildWhatsAppMessage(lead) {
    return `${config.textos.chamadaWhatsApp}

Meus dados:
Nome: ${lead.nome}
Cidade/Bairro: ${displayValue([lead.cidade, lead.bairro].filter(Boolean).join(" / "))}
WhatsApp: ${lead.whatsapp}
E-mail: ${displayValue(lead.email)}

Objetivo principal: ${lead.objetivo}
Acompanhamento nutricional atual: ${displayValue(lead.acompanhamento_atual)}
Restrição alimentar: ${displayValue(lead.restricao_alimentar)}
Condição de saúde importante: ${displayValue(lead.condicao_saude)}
Rotina alimentar: ${displayValue(lead.rotina_alimentar)}
Preferência de atendimento: ${displayValue(lead.preferencia_atendimento)}
Melhor horário para contato: ${displayValue(lead.melhor_horario)}
Mensagem adicional: ${displayValue(lead.mensagem_adicional)}

Aguardo seu retorno para agendarmos.`;
  }

  function openWhatsApp(lead) {
    const message = encodeURIComponent(buildWhatsAppMessage(lead));
    const url = `https://wa.me/${config.profissional.whatsapp}?text=${message}`;
    window.location.href = url;
  }

  function setSubmitButtonText(button, text) {
    const label = button.querySelector("span");
    if (label) {
      label.textContent = text;
      return;
    }

    button.textContent = text;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const submitButton = form.querySelector("button[type='submit']");
    const lead = buildLeadPayload(new FormData(form));
    const validationMessage = validateLead(lead);

    if (validationMessage) {
      setFeedback(validationMessage, "error");
      return;
    }

    try {
      submitButton.disabled = true;
      setSubmitButtonText(submitButton, "Enviando...");
      setFeedback("Salvando suas informações com segurança...", "");

      await window.SupabaseLeadService.insertLead(lead);

      setFeedback("Dados salvos. Redirecionando para o WhatsApp...", "success");
      setTimeout(function () {
        openWhatsApp(lead);
      }, 600);
    } catch (error) {
      console.error(error);
      submitButton.disabled = false;
      setSubmitButtonText(submitButton, "Enviar cadastro");
      setFeedback(error.message || "Não foi possível enviar agora. Tente novamente em alguns instantes.", "error");
    }
  });
})();
