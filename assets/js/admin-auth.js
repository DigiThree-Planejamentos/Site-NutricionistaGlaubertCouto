(function () {
  const config = window.APP_CONFIG.supabase;

  function createAdminClient() {
    if (!window.supabase || !config.url || !config.anonKey) {
      throw new Error("Supabase nao configurado.");
    }

    return window.supabase.createClient(config.url, config.anonKey);
  }

  async function getAuthorizedAdmin(client) {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    const session = sessionData.session;

    if (!session) {
      return null;
    }

    const { data, error } = await client
      .from("admin_users")
      .select("id,user_id,email,nome,role,ativo")
      .eq("user_id", session.user.id)
      .eq("ativo", true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      await client.auth.signOut();
      return null;
    }

    return {
      session,
      admin: data,
      canEdit: data.role === "owner" || data.role === "editor"
    };
  }

  async function signIn(client, email, password) {
    const { error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }

    return getAuthorizedAdmin(client);
  }

  async function signOut(client) {
    await client.auth.signOut();
  }

  window.AdminAuth = {
    createAdminClient,
    getAuthorizedAdmin,
    signIn,
    signOut
  };
})();
