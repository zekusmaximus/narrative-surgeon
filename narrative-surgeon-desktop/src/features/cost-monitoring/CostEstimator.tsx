import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Clock
} from 'lucide-react';
import { 
  estimateAnalysisCost, 
  ModelName, 
  ANALYSIS_COSTS,
  Budget,
  estimateTokens
} from '@/lib/cost';
import { globalRateLimitManager } from '@/lib/rate-limit-config';

interface CostEstimatorProps {
  sceneLength: number;
  analysisTypes: (keyof typeof ANALYSIS_COSTS)[];
  model?: ModelName;
  budget: Budget;
  onProceed?: (estimatedCost: number) => void;
  onCancel?: () => void;
  className?: string;
}

export function CostEstimator({
  sceneLength,
  analysisTypes,
  model = 'gpt-3.5-turbo',
  budget,
  onProceed,
  onCancel,
  className
}: CostEstimatorProps) {
  const [estimates, setEstimates] = useState<{
    [K in keyof typeof ANALYSIS_COSTS]?: {
      cost: number;
      tokens: number;
    }
  }>({});
  const [totalCost, setTotalCost] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [canAfford, setCanAfford] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    calculateEstimates();
  }, [sceneLength, analysisTypes, model]);

  const calculateEstimates = async () => {
    setIsCalculating(true);
    
    try {
      const newEstimates: typeof estimates = {};
      let total = 0;
      let totalTokensUsed = 0;

      for (const analysisType of analysisTypes) {
        const estimate = estimateAnalysisCost(sceneLength, analysisType, model);
        newEstimates[analysisType] = {
          cost: estimate.estimatedCost,
          tokens: estimate.tokenUsage.totalTokens
        };
        total += estimate.estimatedCost;
        totalTokensUsed += estimate.tokenUsage.totalTokens;
      }

      setEstimates(newEstimates);
      setTotalCost(total);
      setTotalTokens(totalTokensUsed);
      setCanAfford(budget.canAfford(total));
    } finally {
      setIsCalculating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(amount);
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const getAnalysisTypeLabel = (type: keyof typeof ANALYSIS_COSTS) => {
    const labels = {
      events: 'Event Analysis',
      plants: 'Plants & Payoffs',
      state: 'Character States',
      beats: 'Story Beats',
      full_analysis: 'Full Analysis'
    };
    return labels[type] || type;
  };

  const remainingBudget = budget.getRemaining();
  const budgetAfterProcessing = remainingBudget - totalCost;
  const providerConfig = globalRateLimitManager.getProviderConfig(model.includes('gpt') ? 'openai-gpt3.5' : 'anthropic-claude3-haiku');

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Cost Estimation
          {isCalculating && <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Summary */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Total Estimated Cost</span>
            <span className="text-2xl font-bold">{formatCurrency(totalCost)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total Tokens</span>
            <span>{formatTokens(totalTokens)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Model</span>
            <Badge variant="outline">{model}</Badge>
          </div>
        </div>

        {/* Budget Impact */}
        <div className={`p-4 rounded-lg border ${
          canAfford ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {canAfford ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span className="font-medium">Budget Impact</span>
          </div>
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Current Budget:</span>
              <span>{formatCurrency(remainingBudget)}</span>
            </div>
            <div className="flex justify-between">
              <span>After Processing:</span>
              <span className={budgetAfterProcessing < 0 ? 'text-red-600 font-medium' : ''}>
                {formatCurrency(budgetAfterProcessing)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Budget Usage:</span>
              <span>{((totalCost / remainingBudget) * 100).toFixed(1)}%</span>
            </div>
          </div>

          {!canAfford && (
            <div className="mt-2 text-sm text-red-700">
              Insufficient budget. Need {formatCurrency(totalCost - remainingBudget)} more.
            </div>
          )}
        </div>

        {/* Analysis Breakdown */}
        <div>
          <h4 className="font-medium mb-3">Analysis Breakdown</h4>
          <div className="space-y-2">
            {analysisTypes.map((type) => {
              const estimate = estimates[type];
              if (!estimate) return null;

              return (
                <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{getAnalysisTypeLabel(type)}</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatCurrency(estimate.cost)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTokens(estimate.tokens)} tokens
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rate Limiting Info */}
        {providerConfig && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Processing Time</span>
            </div>
            <div className="text-sm text-blue-700">
              Estimated: {Math.ceil(analysisTypes.length / providerConfig.maxConcurrent)}–{Math.ceil(analysisTypes.length)} requests
              ({Math.ceil(analysisTypes.length * 2)} seconds)
            </div>
          </div>
        )}

        {/* Cost Optimization Suggestions */}
        {totalCost > 0.05 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium">Cost Optimization</span>
            </div>
            <div className="text-sm text-yellow-700 space-y-1">
              {model.includes('gpt-4') && (
                <div>• Consider using GPT-3.5 Turbo for ~10x cost savings</div>
              )}
              {analysisTypes.includes('full_analysis') && (
                <div>• Full analysis is expensive - consider specific modules only</div>
              )}
              {sceneLength > 5000 && (
                <div>• Large scene - consider splitting for better results</div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={() => onProceed?.(totalCost)}
            disabled={!canAfford || totalCost === 0}
            className="flex-1"
          >
            {canAfford ? `Proceed (${formatCurrency(totalCost)})` : 'Insufficient Budget'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CostEstimator;