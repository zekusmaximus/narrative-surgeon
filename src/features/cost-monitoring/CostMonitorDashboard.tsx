import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Zap,
  BarChart3,
  Settings,
  RefreshCw
} from 'lucide-react';
import { Budget, type BudgetAlert, type CostBreakdown, type ModelName } from '@/lib/cost';
import { globalRateLimitManager } from '@/lib/rate-limit-config';
import { LLMQueue, type QueueStatus } from '@/lib/llm-queue';

interface CostMonitorDashboardProps {
  budget: Budget;
  llmQueue: LLMQueue;
  onBudgetUpdate?: (newCap: number) => void;
  onReset?: () => void;
  className?: string;
}

export function CostMonitorDashboard({
  budget,
  llmQueue,
  onBudgetUpdate,
  onReset,
  className
}: CostMonitorDashboardProps) {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newBudgetCap, setNewBudgetCap] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 5000); // Refresh every 5 seconds

    refreshData(); // Initial load

    return () => clearInterval(interval);
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const status = llmQueue.getStatus();
      setQueueStatus(status);

      // Check for budget alerts
      const percentage = budget.getUsagePercentage();
      const currentAlerts: BudgetAlert[] = [];
      
      if (percentage >= 100) {
        currentAlerts.push({
          type: 'exceeded',
          message: 'Budget exceeded! Processing has stopped.',
          currentUsage: budget.getUsed(),
          limit: budget.getUsed() / (percentage / 100),
          percentage
        });
      } else if (percentage >= 95) {
        currentAlerts.push({
          type: 'critical',
          message: 'Budget 95% used. Immediate attention required.',
          currentUsage: budget.getUsed(),
          limit: budget.getUsed() / (percentage / 100),
          percentage
        });
      } else if (percentage >= 80) {
        currentAlerts.push({
          type: 'warning',
          message: 'Budget 80% used. Consider increasing limit.',
          currentUsage: budget.getUsed(),
          limit: budget.getUsed() / (percentage / 100),
          percentage
        });
      }

      setAlerts(currentAlerts);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBudgetUpdate = () => {
    const newCap = parseFloat(newBudgetCap);
    if (isNaN(newCap) || newCap <= 0) return;
    
    budget.setCap(newCap);
    onBudgetUpdate?.(newCap);
    setNewBudgetCap('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(amount);
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const getAlertColor = (type: BudgetAlert['type']) => {
    switch (type) {
      case 'exceeded': return 'destructive';
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  const getHealthBadgeVariant = (percentage: number) => {
    if (percentage >= 95) return 'destructive';
    if (percentage >= 80) return 'secondary';
    return 'default';
  };

  const spendingByModel = budget.getSpendingByModel();
  const last24hSpending = budget.getSpendingByPeriod(24);
  const providerStats = globalRateLimitManager.getAllProviderStats();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Card key={index} className={`border-l-4 ${
              alert.type === 'exceeded' ? 'border-l-red-500' :
              alert.type === 'critical' ? 'border-l-orange-500' :
              'border-l-yellow-500'
            }`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${
                    alert.type === 'exceeded' ? 'text-red-500' :
                    alert.type === 'critical' ? 'text-orange-500' :
                    'text-yellow-500'
                  }`} />
                  <span className="font-medium">{alert.message}</span>
                  <Badge variant={getAlertColor(alert.type)}>
                    {alert.percentage.toFixed(1)}% used
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Used</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget.getUsed())}</div>
            <div className="text-xs text-muted-foreground">
              of {formatCurrency(budget.getUsed() + budget.getRemaining())} total
            </div>
            <Progress 
              value={budget.getUsagePercentage()} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
            <Badge variant={getHealthBadgeVariant(budget.getUsagePercentage())}>
              {budget.getUsagePercentage().toFixed(1)}%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget.getRemaining())}</div>
            <div className="text-xs text-muted-foreground">
              Available for processing
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Spending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(last24hSpending)}</div>
            <div className="text-xs text-muted-foreground">
              Last 24 hours
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queueStatus ? formatTokens(queueStatus.total_tokens_used) : '0'}
            </div>
            <div className="text-xs text-muted-foreground">
              Tokens processed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Status */}
      {queueStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Processing Queue Status
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{queueStatus.pending}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{queueStatus.processing}</div>
                <div className="text-sm text-muted-foreground">Processing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{queueStatus.completed}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{queueStatus.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Average processing time: {Math.round(queueStatus.average_processing_time)}ms
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rate Limiting Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Rate Limiting Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {providerStats.map((provider) => (
              <div key={provider.providerId} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{provider.provider}</div>
                  <div className="text-sm text-muted-foreground">
                    {provider.current}/{provider.max} requests/min
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={provider.utilizationPercent > 80 ? 'destructive' : 'default'}>
                    {provider.utilizationPercent.toFixed(0)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Spending by Model */}
      {Object.keys(spendingByModel).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spending by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(spendingByModel).map(([model, amount]) => (
                <div key={model} className="flex items-center justify-between">
                  <div className="font-medium">{model}</div>
                  <div className="text-right">
                    <div className="font-mono">{formatCurrency(amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {((amount / budget.getUsed()) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Budget Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="New budget cap ($)"
              value={newBudgetCap}
              onChange={(e) => setNewBudgetCap(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <Button onClick={handleBudgetUpdate} disabled={!newBudgetCap}>
              Update Cap
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onReset}>
              Reset Budget
            </Button>
            <Button variant="outline" onClick={() => budget.reset()}>
              Clear History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CostMonitorDashboard;