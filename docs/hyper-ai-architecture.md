# Hyper AI request path

Hyper AI uses one authenticated request per user turn:

1. `VoiceChatModal` collects the message and builds a sanitized `HyperAppContext` from the current screen, timestamped approximate location, nearby community reports, Guardian configuration count, and supported UI actions.
2. `ConversationEngine` appends the user turn, applies deterministic safety and correction tracking, selects recent messages under a character budget, and updates a rolling summary only when older turns no longer fit.
3. `ConversationRepository` persists the state through the signed-in Supabase client. The database enforces per-user RLS; when persistence is disabled, the server copy is deleted and the active conversation remains scoped to that user in session storage.
4. `aiClient` sends the context envelope to the authenticated `hyper-ai` Supabase Edge Function. Provider credentials and the permanent system prompt never enter the browser bundle.
5. The edge function authenticates the user, re-sanitizes untrusted input, applies the deterministic safety floor, and calls the existing Cloudflare Workers AI model through a single provider adapter.
6. The response parser validates safety metadata and suggested actions against actions the current UI actually exposed. The UI never executes a model action automatically.

Direct emergency controls remain independent of the model request, so a provider timeout or rate limit does not remove them.

Sensitive conversation content, precise coordinates, contact details, tokens, and safety plans must not be written to application logs.
