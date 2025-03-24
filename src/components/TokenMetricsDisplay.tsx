import React, { useEffect, useState } from 'react';
import { TokenMetricsService } from '../trading/services/TokenMetricsService';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  LinearProgress,
  useTheme
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';

interface TokenMetricsDisplayProps {
  metricsService: TokenMetricsService;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  color?: string;
}

export const TokenMetricsDisplay: React.FC<TokenMetricsDisplayProps> = ({ metricsService }) => {
  const theme = useTheme();
  const [metrics, setMetrics] = useState(metricsService.getMetrics());
  const [priceHistory, setPriceHistory] = useState<Array<{ timestamp: number; price: number }>>([]);
  const [recentTrades, setRecentTrades] = useState(metricsService.getRecentTrades());

  useEffect(() => {
    const onMetricsUpdate = (newMetrics: ReturnType<typeof metricsService.getMetrics>) => {
      setMetrics(newMetrics);
    };
    
    const onNewTrade = () => {
      setRecentTrades(metricsService.getRecentTrades());
      setPriceHistory(metricsService.getPriceHistory('1h'));
    };

    metricsService.on('metricsUpdate', onMetricsUpdate);
    metricsService.on('newTrade', onNewTrade);

    setPriceHistory(metricsService.getPriceHistory('1h'));

    return () => {
      metricsService.off('metricsUpdate', onMetricsUpdate);
      metricsService.off('newTrade', onNewTrade);
    };
  }, [metricsService]);

  const chartData: ChartData<'line'> = {
    labels: priceHistory.map((p) => new Date(p.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Price',
        data: priceHistory.map((p) => p.price),
        fill: false,
        borderColor: theme.palette.primary.main,
        tension: 0.1
      }
    ]
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: false
      }
    }
  };

  const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit = '', color = 'primary' }) => (
    <Card>
      <CardContent>
        <Typography variant="h6" color="textSecondary">
          {title}
        </Typography>
        <Typography variant="h4" color={color}>
          {typeof value === 'number' ? value.toFixed(6) : value}
          {unit}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Token Metrics
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Price Chart (1h)</Typography>
              <Box height={300}>
                <Line data={chartData} options={chartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <MetricCard
            title="Current Price"
            value={metrics.currentPrice}
            unit=" SOL"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <MetricCard
            title="24h Change"
            value={metrics.priceChange24h}
            unit="%"
            color={metrics.priceChange24h >= 0 ? 'success.main' : 'error.main'}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <MetricCard
            title="24h Volume"
            value={metrics.volume24h}
            unit=" SOL"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <MetricCard
            title="Liquidity"
            value={metrics.liquidity}
            unit=" SOL"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Moving Averages</Typography>
              <Box mt={2}>
                <Typography variant="body2">MA5: {metrics.movingAverages.ma5.toFixed(6)}</Typography>
                <Typography variant="body2">MA20: {metrics.movingAverages.ma20.toFixed(6)}</Typography>
                <Typography variant="body2">MA50: {metrics.movingAverages.ma50.toFixed(6)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Whale Activity</Typography>
              <Box mt={2}>
                <Typography variant="h4">{metrics.whaleActivity}</Typography>
                <Typography variant="body2">trades in last 24h</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Recent Trades</Typography>
              <Box mt={2} maxHeight={200} overflow="auto">
                {recentTrades.map((trade, index) => (
                  <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">
                      {trade.isWhale ? '🐋 ' : ''}
                      {trade.price.toFixed(6)} SOL
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 