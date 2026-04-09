import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/theme";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import YouTubePage from "@/pages/youtube";
import InstagramPage from "@/pages/instagram";
import FacebookPage from "@/pages/facebook";
import Reports from "@/pages/reports";
import Connections from "@/pages/connections";
import FetchPage from "@/pages/fetch";
import LoginPage from "@/pages/login";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/youtube" component={YouTubePage} />
        <Route path="/instagram" component={InstagramPage} />
        <Route path="/facebook" component={FacebookPage} />
        <Route path="/reports" component={Reports} />
        <Route path="/connections" component={Connections} />
        <Route path="/fetch" component={FetchPage} />
        <Route path="/login" component={LoginPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
