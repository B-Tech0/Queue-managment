import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, LogIn, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

const INDUSTRY_INFO: Record<string, { icon: string; color: string }> = {
  hospital: { icon: "🏥", color: "bg-blue-50 border-blue-200" },
  salon: { icon: "✂️", color: "bg-pink-50 border-pink-200" },
  bank: { icon: "🏦", color: "bg-amber-50 border-amber-200" },
  restaurant: { icon: "🍽️", color: "bg-green-50 border-green-200" },
  government: { icon: "🏛️", color: "bg-purple-50 border-purple-200" },
};

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 12;

  const { data: companies, isLoading } = trpc.companies.list.useQuery({
    limit,
    offset,
    search: search || undefined,
  });

  const handleCompanyClick = (slug: string) => {
    navigate(`/q/${slug}`);
  };

  const handleRegisterCompany = () => {
    if (isAuthenticated) {
      navigate("/dashboard" as any);
    } else {
      window.location.href = getLoginUrl("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
              Q
            </div>
            <span className="text-xl font-bold text-slate-900">QueueFlow</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Button
                  onClick={handleRegisterCompany}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4" />
                  Register Company
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="text-slate-700"
                >
                  Dashboard
                </Button>
              </>
            ) : (
              <Button
                onClick={() => (window.location.href = getLoginUrl("/"))}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
          Elegant Queue Management
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
            For Every Business
          </span>
        </h1>
        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          Streamline customer flow with real-time queue tracking, automated notifications, and beautiful displays.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleRegisterCompany}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
          >
            Get Started
          </Button>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search companies by name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              className="pl-12 py-6 text-lg border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-0"
            />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : companies && companies.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {companies.map((company) => {
                const industryInfo = INDUSTRY_INFO[company.industry] || INDUSTRY_INFO.hospital;
                return (
                  <Card
                    key={company.id}
                    className={`p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-2 ${industryInfo.color}`}
                    onClick={() => handleCompanyClick(company.slug)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-4xl">{industryInfo.icon}</div>
                      <Badge variant="secondary" className="text-xs font-semibold capitalize">
                        {company.industry}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{company.name}</h3>
                    <Button
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompanyClick(company.slug);
                      }}
                    >
                      Join Queue
                    </Button>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-lg text-slate-600 mb-6">No companies found yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
