import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import * as bcrypt from "npm:bcrypt@5.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, email, password, newPassword } = await req.json();

    if (action === "login") {
      const { data: client, error } = await supabase
        .from("clients")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error || !client) {
        return new Response(
          JSON.stringify({ error: "Email ou mot de passe incorrect" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!client.password_hash) {
        return new Response(
          JSON.stringify({
            error: "Aucun mot de passe défini. Veuillez contacter votre technicien."
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const passwordMatch = await bcrypt.compare(password, client.password_hash);

      if (!passwordMatch) {
        return new Response(
          JSON.stringify({ error: "Email ou mot de passe incorrect" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          mustChangePassword: client.must_change_password || false,
          client: {
            id: client.id,
            name: client.name,
            email: client.email
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "change_password") {
      const { data: client, error } = await supabase
        .from("clients")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error || !client) {
        return new Response(
          JSON.stringify({ error: "Client non trouvé" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (client.password_hash) {
        const passwordMatch = await bcrypt.compare(password, client.password_hash);
        if (!passwordMatch) {
          return new Response(
            JSON.stringify({ error: "Mot de passe actuel incorrect" }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const { error: updateError } = await supabase
        .from("clients")
        .update({
          password_hash: hashedPassword,
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
        })
        .eq("id", client.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Erreur lors du changement de mot de passe" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "set_password") {
      const { clientId } = await req.json();

      if (!clientId || !newPassword) {
        return new Response(
          JSON.stringify({ error: "Client ID et mot de passe requis" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const { error: updateError } = await supabase
        .from("clients")
        .update({
          password_hash: hashedPassword,
          must_change_password: true,
          password_changed_at: new Date().toISOString(),
        })
        .eq("id", clientId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Erreur lors de la définition du mot de passe" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Action non reconnue" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
