import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    const action = url.searchParams.get("action");

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: "Email invalide" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "get_chantiers") {
      const { data: allChantiers } = await supabase
        .from("chantiers")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });

      const chantiersWithClosedInterventions = [];

      if (allChantiers) {
        for (const chantier of allChantiers) {
          const { data: closedInterventions } = await supabase
            .from("interventions")
            .select("id")
            .eq("chantier_id", chantier.id)
            .eq("is_closed", true)
            .limit(1);

          if (closedInterventions && closedInterventions.length > 0) {
            chantiersWithClosedInterventions.push(chantier);
          }
        }
      }

      return new Response(
        JSON.stringify({ client, chantiers: chantiersWithClosedInterventions }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "get_interventions") {
      const chantierId = url.searchParams.get("chantier_id");

      if (!chantierId) {
        return new Response(
          JSON.stringify({ error: "ID du chantier requis" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: chantier } = await supabase
        .from("chantiers")
        .select("*")
        .eq("id", chantierId)
        .eq("client_id", client.id)
        .maybeSingle();

      if (!chantier) {
        return new Response(
          JSON.stringify({ error: "Chantier non trouvé" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: interventions } = await supabase
        .from("interventions")
        .select(`
          *,
          categories (name)
        `)
        .eq("chantier_id", chantierId)
        .eq("status", "termine")
        .eq("is_closed", true)
        .order("intervention_date", { ascending: false });

      return new Response(
        JSON.stringify({ chantier, interventions: interventions || [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "get_intervention_details") {
      const interventionId = url.searchParams.get("intervention_id");

      if (!interventionId) {
        return new Response(
          JSON.stringify({ error: "ID de l'intervention requis" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: intervention } = await supabase
        .from("interventions")
        .select(`
          *,
          categories (name),
          chantiers!inner (client_id)
        `)
        .eq("id", interventionId)
        .maybeSingle();

      if (!intervention || intervention.chantiers.client_id !== client.id) {
        return new Response(
          JSON.stringify({ error: "Intervention non trouvée" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: sections } = await supabase
        .from("intervention_sections")
        .select("*")
        .eq("intervention_id", interventionId);

      const sectionsWithPhotos = await Promise.all(
        (sections || []).map(async (section) => {
          const { data: photos } = await supabase
            .from("section_photos")
            .select("*")
            .eq("section_id", section.id);

          return { ...section, photos: photos || [] };
        })
      );

      return new Response(
        JSON.stringify({ intervention, sections: sectionsWithPhotos }),
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
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
