import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Phone, CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function QueueManagement() {
  const { user } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedQueueId, setSelectedQueueId] = useState<number | null>(null);
  const [newQueueName, setNewQueueName] = useState("");
  const [newQueueServiceType, setNewQueueServiceType] = useState("");

  const { data: companies, isLoading: companiesLoading } = trpc.companies.getMyCompanies.useQuery();
  const { data: queues, isLoading: queuesLoading } = trpc.queues.list.useQuery(
    { companyId: selectedCompanyId || 0 },
    { enabled: !!selectedCompanyId }
  );
  const { data: tickets, isLoading: ticketsLoading } = trpc.tickets.list.useQuery(
    { queueId: selectedQueueId || 0 },
    { enabled: !!selectedQueueId }
  );

  const createQueueMutation = trpc.queues.create.useMutation();
  const callNextMutation = trpc.tickets.callNext.useMutation();
  const markServingMutation = trpc.tickets.markServing.useMutation();
  const markDoneMutation = trpc.tickets.markDone.useMutation();

  const handleCreateQueue = async () => {
    if (!selectedCompanyId || !newQueueName) return;
    try {
      await createQueueMutation.mutateAsync({
        companyId: selectedCompanyId,
        name: newQueueName,
        serviceType: newQueueServiceType,
      });
      setNewQueueName("");
      setNewQueueServiceType("");
      toast.success("Queue created successfully");
    } catch (error) {
      toast.error("Failed to create queue");
    }
  };

  const handleCallNext = async () => {
    if (!selectedQueueId) return;
    try {
      await callNextMutation.mutateAsync({ queueId: selectedQueueId });
      toast.success("Next ticket called");
    } catch (error) {
      toast.error("Failed to call next ticket");
    }
  };

  const handleMarkServing = async (ticketId: number, counterNumber?: number) => {
    try {
      await markServingMutation.mutateAsync({ ticketId, counterNumber });
      toast.success("Ticket marked as serving");
    } catch (error) {
      toast.error("Failed to mark ticket");
    }
  };

  const handleMarkDone = async (ticketId: number) => {
    try {
      await markDoneMutation.mutateAsync({ ticketId });
      toast.success("Ticket marked as done");
    } catch (error) {
      toast.error("Failed to mark ticket");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Queue Management</h1>
        <p className="text-slate-600 mt-2">Manage your company queues and serve customers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Selection */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Your Companies</h2>
          {companiesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : companies && companies.length > 0 ? (
            <div className="space-y-2">
              {companies.map((company) => (
                <Button
                  key={company.id}
                  variant={selectedCompanyId === company.id ? "default" : "outline"}
                  onClick={() => {
                    setSelectedCompanyId(company.id);
                    setSelectedQueueId(null);
                  }}
                  className="w-full justify-start"
                >
                  {company.name}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-slate-600">No companies found</p>
          )}
        </div>

        {/* Queue Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Queues</h2>
            {selectedCompanyId && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Queue</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="queue-name">Queue Name</Label>
                      <Input
                        id="queue-name"
                        placeholder="e.g., General Checkup"
                        value={newQueueName}
                        onChange={(e) => setNewQueueName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="service-type">Service Type (optional)</Label>
                      <Input
                        id="service-type"
                        placeholder="e.g., Medical"
                        value={newQueueServiceType}
                        onChange={(e) => setNewQueueServiceType(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleCreateQueue}
                      disabled={createQueueMutation.isPending || !newQueueName}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {createQueueMutation.isPending ? "Creating..." : "Create Queue"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {selectedCompanyId ? (
            queuesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : queues && queues.length > 0 ? (
              <div className="space-y-2">
                {queues.map((queue) => (
                  <Button
                    key={queue.id}
                    variant={selectedQueueId === queue.id ? "default" : "outline"}
                    onClick={() => setSelectedQueueId(queue.id)}
                    className="w-full justify-start"
                  >
                    {queue.name}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-slate-600">No queues. Create one to get started.</p>
            )
          ) : (
            <p className="text-slate-600">Select a company first</p>
          )}
        </div>

        {/* Queue Controls */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Controls</h2>
          {selectedQueueId ? (
            <Button
              onClick={handleCallNext}
              disabled={callNextMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6"
            >
              {callNextMutation.isPending ? "Calling..." : "Call Next Ticket"}
            </Button>
          ) : (
            <p className="text-slate-600">Select a queue to manage</p>
          )}
        </div>
      </div>

      {/* Tickets List */}
      {selectedQueueId && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Queue Tickets</h2>
          {ticketsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : tickets && tickets.length > 0 ? (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <Card key={ticket.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-blue-600 font-mono">{ticket.ticketNumber}</div>
                      <div>
                        <p className="font-semibold text-slate-900">{ticket.customerName}</p>
                        <p className="text-sm text-slate-600">{ticket.customerPhone}</p>
                      </div>
                    </div>
                    <Badge
                      className={`${
                        ticket.status === "waiting"
                          ? "bg-amber-100 text-amber-900"
                          : ticket.status === "called"
                            ? "bg-blue-100 text-blue-900"
                            : ticket.status === "serving"
                              ? "bg-green-100 text-green-900"
                              : "bg-slate-100 text-slate-900"
                      }`}
                    >
                      {ticket.status}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    {ticket.status === "called" && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkServing(ticket.id)}
                        disabled={markServingMutation.isPending}
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Phone className="w-4 h-4" />
                        Serving
                      </Button>
                    )}
                    {ticket.status === "serving" && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkDone(ticket.id)}
                        disabled={markDoneMutation.isPending}
                        className="gap-2 bg-slate-600 hover:bg-slate-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Done
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-slate-600">No tickets in this queue</p>
          )}
        </div>
      )}
    </div>
  );
}
