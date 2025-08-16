import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  AlertTriangle, 
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { Budget, type BudgetAlert } from '@/lib/cost';

interface BudgetWidgetProps {
  budget: Budget;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
  onAlert?: (alert: BudgetAlert) => void;
}

export function BudgetWidget({
  budget,
  showDetails = true,
  compact = false,
  className,
  onAlert
}: BudgetWidgetProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastAlert, setLastAlert] = useState<BudgetAlert | null>(null);

  const used = budget.getUsed();
  const remaining = budget.getRemaining();
  const total = used + remaining;
  const percentage = budget.getUsagePercentage();

  useEffect(() => {
    // Check for alerts
    let alert: BudgetAlert | null = null;
    
    if (percentage >= 100) {
      alert = {
        type: 'exceeded',
        message: 'Budget exceeded!',
        currentUsage: used,
        limit: total,
        percentage
      };
    } else if (percentage >= 95) {
      alert = {
        type: 'critical',
        message: 'Budget 95% used',
        currentUsage: used,
        limit: total,
        percentage
      };
    } else if (percentage >= 80) {
      alert = {
        type: 'warning',
        message: 'Budget 80% used',
        currentUsage: used,
        limit: total,
        percentage
      };
    }

    if (alert && (!lastAlert || alert.percentage > lastAlert.percentage)) {
      setLastAlert(alert);
      onAlert?.(alert);
    }
  }, [used, percentage, lastAlert, onAlert, total]);

  const getStatusColor = () => {
    if (percentage >= 95) return 'text-red-600';
    if (percentage >= 80) return 'text-orange-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = () => {
    if (percentage >= 95) return 'bg-red-600';
    if (percentage >= 80) return 'bg-orange-600';
    if (percentage >= 60) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  const getBadgeVariant = () => {
    if (percentage >= 95) return 'destructive' as const;
    if (percentage >= 80) return 'secondary' as const;
    return 'default' as const;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: amount < 0.01 ? 4 : 2
    }).format(amount);
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <DollarSign className="w-4 h-4 text-muted-foreground" />
        <div className="flex-1">
          <Progress value={percentage} className="h-2" />
        </div>
        <Badge variant={getBadgeVariant()}>
          {formatCurrency(remaining)}
        </Badge>
        {lastAlert && (
          <AlertTriangle className="w-4 h-4 text-orange-500" />
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Budget</span>
            {lastAlert && (
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={getBadgeVariant()}>
              {percentage.toFixed(1)}%
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(!isVisible)}
            >
              {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <Progress 
          value={percentage} 
          className="mb-3"
        />

        {isVisible && showDetails && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Used:</span>
              <span className={getStatusColor()}>{formatCurrency(used)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining:</span>
              <span>{formatCurrency(remaining)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{formatCurrency(total)}</span>
            </div>
            
            {budget.getSpendingByPeriod(24) > 0 && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">24h:</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {formatCurrency(budget.getSpendingByPeriod(24))}
                </span>
              </div>
            )}
          </div>
        )}

        {lastAlert && isVisible && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-orange-800">{lastAlert.message}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BudgetWidget;