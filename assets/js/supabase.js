(function () {
  const config = window.APP_CONFIG.supabase;

  function isConfigured() {
    return Boolean(
      config.url &&
      config.anonKey &&
      !config.url.includes("SEU-PROJETO") &&
      !config.anonKey.includes("SUA_SUPABASE")
    );
  }

  // Cria o cliente oficial do Supabase apenas quando as chaves foram configuradas.
  const client = isConfigured() && window.supabase
    ? window.supabase.createClient(config.url, config.anonKey)
    : null;

  async function insertLead(leadData) {
    if (!client) {
      throw new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY em assets/js/config.js antes de enviar leads.");
    }

    // Nao usamos .select() aqui para manter o fluxo publico apenas com permissao de insert.
    const { error } = await client
      .from("leads_nutricionista")
      .insert([leadData]);

    if (error) {
      throw error;
    }

    return true;
  }

  window.SupabaseLeadService = {
    insertLead,
    isConfigured
  };
})();
