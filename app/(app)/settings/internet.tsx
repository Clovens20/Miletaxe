import { Redirect, type Href } from 'expo-router';

/** Ancien chemin : redirige vers les dépenses récurrentes (onglet internet). */
export default function InternetPlanRedirect() {
  return <Redirect href={'/(app)/settings/recurring?kind=internet' as Href} />;
}
