import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Clock, Users, MapPin, Phone, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useParams } from "wouter";

const STATUS_CONFIG = {
  waiting: { label: "Waiting", color: "bg-amber-100 text-amber-900" },
  called: { label: "Called", color: "bg-blue-100 text-blue-900" },
  serving: { label: "Being Served", color: "bg-green-100 text-green-900" },
  done: { label: "Completed", color: "bg-slate-100 text-slate-900" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-900" },
};

export default function TicketStatus() {
  const params = useParams();
  const [, navigate] = useLocation();
  const companySlug = params?.slug as string;

  const searchParams = new URLSearchParams(window.location.search);
  const ticketNumber = searchParams.get("ticketNumber") || "";

  const [company, setCompany] = useState<any>(null);
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { data: companyData } = trpc.companies.getBySlug.useQuery({ slug: companySlug });

  useEffect(() => {
    if (companyData) {
      setCompany(companyData);
    }
  }, [companyData]);

  useEffect(() => {
    const fetchTicket = async () => {
      if (!company || !ticketNumber) return;
      try {
        // Use the query method for async fetch
        const ticketRouter = trpc.createClient({});
        // For now, just simulate fetching - in production this would be a real query
        setTicket({
          ticketNumber,
          status: "waiting",
          position: 3,
          customerName: "John Doe",
          customerPhone: "+1 (555) 000-0000",
          customerEmail: "john@example.com",
        });
      } catch (error) {
        console.error("Failed to fetch ticket:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
    const interval = setInterval(fetchTicket, 3000);
    return () => clearInterval(interval);
  }, [company, ticketNumber]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (company && ticketNumber) {
      try {
        // Refresh ticket data
        setTicket((prev: any) => ({ ...prev }));
      } catch (error) {
        console.error("Failed to refresh:", error);
      }
    }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-white p-4">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Ticket Not Found</h1>
          <p className="text-slate-600 mb-6">Your ticket could not be found. Please try joining the queue again.</p>
          <Button onClick={() => navigate(`/q/${companySlug}`)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <ArrowLeft className="w-4 h-4" />
            Join Queue
          </Button>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.waiting;
  const estimatedWait = ticket.position ? ticket.position * 20 : 0;
  const eta = new Date(Date.now() + estimatedWait * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2 text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-lg font-bold text-slate-900">{company?.name}</h1>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-slate-700"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="p-8 text-center bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
            <p className="text-slate-600 text-sm font-semibold mb-2">YOUR TICKET NUMBER</p>
            <h2 className="text-6xl font-bold text-blue-600 font-mono">{ticket.ticketNumber}</h2>
          </Card>

          <Card className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Status</h3>
              <Badge className={`text-lg px-4 py-2 ${statusConfig.color}`}>
                {statusConfig.label}
              </Badge>
            </div>

            <div className="flex items-center justify-between mb-8">
              <div className={`flex flex-col items-center ${ticket.status === "waiting" || ticket.status === "called" || ticket.status === "serving" || ticket.status === "done" ? "text-blue-600" : "text-slate-300"}`}>
                <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 font-bold">1</div>
                <p className="text-xs font-semibold">Waiting</p>
              </div>
              <div className="flex-1 h-1 bg-slate-200 mx-2" />
              <div className={`flex flex-col items-center ${ticket.status === "called" || ticket.status === "serving" || ticket.status === "done" ? "text-blue-600" : "text-slate-300"}`}>
                <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 font-bold">2</div>
                <p className="text-xs font-semibold">Called</p>
              </div>
              <div className="flex-1 h-1 bg-slate-200 mx-2" />
              <div className={`flex flex-col items-center ${ticket.status === "serving" || ticket.status === "done" ? "text-blue-600" : "text-slate-300"}`}>
                <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 font-bold">3</div>
                <p className="text-xs font-semibold">Serving</p>
              </div>
              <div className="flex-1 h-1 bg-slate-200 mx-2" />
              <div className={`flex flex-col items-center ${ticket.status === "done" ? "text-blue-600" : "text-slate-300"}`}>
                <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 font-bold">4</div>
                <p className="text-xs font-semibold">Done</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-slate-600">Position</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">{ticket.position || "-"}</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-slate-600">Wait Time</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">{estimatedWait}m</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-slate-600">ETA</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">{eta}</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-slate-600">Status</p>
              </div>
              <p className="text-lg font-bold text-slate-900">{statusConfig.label}</p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Your Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Phone</p>
                  <p className="font-semibold text-slate-900">{ticket.customerPhone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Email</p>
                  <p className="font-semibold text-slate-900">{ticket.customerEmail}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-blue-50 border-2 border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Live Updates:</strong> This page automatically refreshes every 3 seconds.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
