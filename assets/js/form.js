(function () {
  const form = document.querySelector("#lead-form");
  const feedback = document.querySelector("#form-feedback");
  const config = window.APP_CONFIG;

  if (!form) return;

  function getValue(formData, field) {
    return String(formData.get(field) || "").trim();
  }

  function setFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = `form-feedback ${type || ""}`.trim();
  }

  function validateLead(lead) {
    if (!lead.nome) return "Informe seu nome completo.";
    if (!lead.whatsapp) return "Informe seu WhatsApp.";
    if (!lead.objetivo) return "Selecione seu principal objetivo.";
    if (!lead.consentimento_lgpd) return "Para enviar, marque a autorização de armazenamento dos dados.";
    return "";
  }

  function buildLeadPayload(formData) {
    return {
      nome: getValue(formData, "nome"),
      whatsapp: getValue(formData, "whatsapp"),
      email: getValue(formData, "email"),
      cidade: getValue(formData, "cidade"),
      bairro: getValue(formData, "bairro"),
      objetivo: getValue(formData, "objetivo"),
      acompanhamento_atual: getValue(formData, "acompanhamento_atual"),
      restricao_alimentar: getValue(formData, "restricao_alimentar"),
      condicao_saude: getValue(formData, "condicao_saude"),
      rotina_alimentar: getValue(formData, "rotina_alimentar"),
      preferencia_atendimento: getValue(formData, "preferencia_atendimento"),
      melhor_horario: getValue(formData, "melhor_horario"),
      mensagem_adicional: getValue(formData, "mensagem_adicional"),
      consentimento_lgpd: formData.get("consentimento_lgpd") === "on"
    };
  }

  function buildWhatsAppMessage(lead) {
    return `${config.textos.chamadaWhatsApp}

Meus dados:
Nome: ${lead.nome}
Cidade/Bairro: ${[lead.cidade, lead.bairro].filter(Boolean).join(" / ")}
WhatsApp: ${lead.whatsapp}
E-mail: ${lead.email}

Objetivo principal: ${lead.objetivo}
Acompanhamento nutricional atual: ${lead.acompanhamento_atual}
Restrição alimentar: ${lead.restricao_alimentar}
Condição de saúde importante: ${lead.condicao_saude}
Rotina alimentar: ${lead.rotina_alimentar}
Preferência de atendimento: ${lead.preferencia_atendimento}
Melhor horário para contato: ${lead.melhor_horario}
Mensagem adicional: ${lead.mensagem_adicional}

Aguardo seu retorno para agendarmos.`;
  }

  function openWhatsApp(lead) {
    const message = encodeURIComponent(buildWhatsAppMessage(lead));
    const url = `https://wa.me/${config.profissional.whatsapp}?text=${message}`;
    window.location.href = url;
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
      submitButton.textContent = "Enviando...";
      setFeedback("Salvando suas informações com segurança...", "");

      await window.SupabaseLeadService.insertLead(lead);

      setFeedback("Dados salvos. Redirecionando para o WhatsApp...", "success");
      setTimeout(function () {
        openWhatsApp(lead);
      }, 600);
    } catch (error) {
      console.error(error);
      setFeedback(error.message || "Não foi possível enviar agora. Tente novamente em alguns instantes.", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Enviar pré-agendamento";
    }
  });
})();
