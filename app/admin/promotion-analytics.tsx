import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Eye, MousePointer2, Users, Repeat, TrendingUp, Calendar, Download, RefreshCw, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { usePromotions } from '@/providers/PromotionProvider';
import type { PromotionAnalytics } from '@/constants/types';
import { useAlert } from '@/providers/AlertProvider';

export default function PromotionAnalyticsScreen() {
  const { promotionId } = useLocalSearchParams<{ promotionId: string }>();
  const { getPromotionAnalytics, promotions, getSponsorById, triggerAggregation, exportAnalyticsCsv } = usePromotions();
  const { showAlert } = useAlert();
  const [analytics, setAnalytics] = useState<PromotionAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAggregating, setIsAggregating] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const promotion = promotions.find((p) => p.id === promotionId);
  const sponsor = promotion?.sponsorId ? getSponsorById(promotion.sponsorId) : undefined;

  const loadAnalytics = useCallback(async () => {
    if (!promotionId) return;
    try {
      const data = await getPromotionAnalytics(promotionId);
      setAnalytics(data);
      console.log('[ANALYTICS] Loaded for', promotionId);
    } catch (e) {
      console.log('[ANALYTICS] Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [promotionId, getPromotionAnalytics]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (!loading && analytics) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      Animated.stagger(
        80,
        cardAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            friction: 7,
            tension: 80,
            useNativeDriver: true,
          }),
        ),
      ).start();
    }
  }, [loading, analytics, fadeAnim, cardAnims]);

  const handleAggregate = useCallback(async () => {
    setIsAggregating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const today = new Date().toISOString().split('T')[0];
      await triggerAggregation(today);
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      await triggerAggregation(yesterday);
      await loadAnalytics();
      showAlert('Aggregation', 'Daily Stats wurden aktualisiert.', undefined, 'success');
    } catch (e: any) {
      showAlert('Fehler', e?.message ?? 'Aggregation fehlgeschlagen', undefined, 'error');
    } finally {
      setIsAggregating(false);
    }
  }, [triggerAggregation, loadAnalytics, showAlert]);

  const handleExportCsv = useCallback(async () => {
    if (!promotionId) return;
    setIsExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const csvContent = await exportAnalyticsCsv(promotionId);
      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `promotion_${promotionId}_analytics.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showAlert('Export', 'CSV wurde heruntergeladen.', undefined, 'success');
      } else {
        showAlert(
          'CSV Export',
          'CSV-Daten generiert. Sharing ist noch nicht implementiert.',
          undefined,
          'info',
        );
      }
    } catch (e: any) {
      showAlert('Fehler', e?.message ?? 'Export fehlgeschlagen', undefined, 'error');
    } finally {
      setIsExporting(false);
    }
  }, [promotionId, exportAnalyticsCsv, showAlert]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Analytics' }} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#BFA35D" />
          <Text style={styles.loadingText}>Lade Analytics...</Text>
        </View>
      </View>
    );
  }

  if (!analytics || !promotion) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Analytics' }} />
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>Keine Daten verfügbar</Text>
        </View>
      </View>
    );
  }

  const kpiCards = [
    {
      icon: Eye,
      label: 'Impressions',
      value: analytics.totalImpressions.toLocaleString('de-DE'),
      sub: 'Gesamt-Aufrufe',
      color: '#BFA35D',
    },
    {
      icon: Users,
      label: 'Unique Reach',
      value: analytics.uniqueReach.toLocaleString('de-DE'),
      sub: 'Einzigartige Nutzer',
      color: '#5DA0E8',
    },
    {
      icon: MousePointer2,
      label: 'CTR',
      value: `${analytics.ctr.toFixed(2)}%`,
      sub: `${analytics.totalClicks} Klicks`,
      color: '#4CAF50',
    },
    {
      icon: Repeat,
      label: 'Frequency',
      value: analytics.avgFrequency.toFixed(1),
      sub: 'Ø Ansichten/Nutzer',
      color: '#FF9800',
    },
    {
      icon: CheckCircle,
      label: 'Qualified',
      value: analytics.qualifiedImpressions.toLocaleString('de-DE'),
      sub: 'Impressions ≥1s',
      color: '#9C27B0',
    },
  ];

  const maxImpressions = Math.max(...analytics.dailyStats.map((d) => d.totalImpressions), 1);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Analytics' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <LinearGradient
            colors={['#1e1d1a', '#1a1918', '#141416']}
            style={styles.heroSection}
          >
            <Text style={styles.heroTitle}>{promotion.title}</Text>
            <Text style={styles.heroSub}>
              {sponsor?.name ?? promotion.promotionType.toUpperCase()} · {promotion.startDate.split('T')[0]} → {promotion.endDate.split('T')[0]}
            </Text>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionButton, isAggregating && styles.actionButtonDisabled]}
                onPress={handleAggregate}
                disabled={isAggregating}
                testID="aggregate-button"
              >
                {isAggregating ? (
                  <ActivityIndicator size="small" color="#BFA35D" />
                ) : (
                  <RefreshCw size={14} color="#BFA35D" />
                )}
                <Text style={styles.actionButtonText}>
                  {isAggregating ? 'Aggregiere...' : 'Stats aktualisieren'}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, isExporting && styles.actionButtonDisabled]}
                onPress={handleExportCsv}
                disabled={isExporting}
                testID="export-csv-button"
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#BFA35D" />
                ) : (
                  <Download size={14} color="#BFA35D" />
                )}
                <Text style={styles.actionButtonText}>
                  {isExporting ? 'Exportiere...' : 'CSV Export'}
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.kpiGrid}>
          {kpiCards.map((kpi, idx) => {
            const IconComp = kpi.icon;
            const animIdx = Math.min(idx, cardAnims.length - 1);
            return (
              <Animated.View
                key={kpi.label}
                style={[
                  styles.kpiCard,
                  {
                    opacity: cardAnims[animIdx],
                    transform: [
                      {
                        translateY: cardAnims[animIdx].interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={[styles.kpiIconWrap, { backgroundColor: `${kpi.color}15` }]}>
                  <IconComp size={18} color={kpi.color} />
                </View>
                <Text style={styles.kpiValue}>{kpi.value}</Text>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <Text style={styles.kpiSub}>{kpi.sub}</Text>
              </Animated.View>
            );
          })}
        </View>

        {analytics.dailyStats.length > 0 && (
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Calendar size={16} color="#BFA35D" />
              <Text style={styles.chartTitle}>Tägliche Impressions</Text>
            </View>
            <View style={styles.chartContainer}>
              {analytics.dailyStats.slice(0, 14).reverse().map((day) => {
                const heightPercent = (day.totalImpressions / maxImpressions) * 100;
                return (
                  <View key={day.date} style={styles.barColumn}>
                    <View style={styles.barValueWrap}>
                      <Text style={styles.barValue}>{day.totalImpressions}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <LinearGradient
                        colors={['#BFA35D', 'rgba(191,163,93,0.4)']}
                        style={[styles.bar, { height: `${Math.max(heightPercent, 3)}%` }]}
                      />
                    </View>
                    <Text style={styles.barDate}>{day.date.slice(5)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {analytics.dailyStats.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>Tägliche Aufschlüsselung</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableDateCell]}>Datum</Text>
              <Text style={styles.tableCell}>Views</Text>
              <Text style={styles.tableCell}>Unique</Text>
              <Text style={styles.tableCell}>Qual.</Text>
              <Text style={styles.tableCell}>Klicks</Text>
              <Text style={styles.tableCell}>CTR</Text>
            </View>
            {analytics.dailyStats.slice(0, 30).map((day) => {
              const dayCtr = day.totalImpressions > 0
                ? ((day.totalClicks / day.totalImpressions) * 100).toFixed(1)
                : '0.0';
              return (
                <View key={day.date} style={styles.tableRow}>
                  <Text style={[styles.tableCellValue, styles.tableDateCell]}>{day.date.slice(5)}</Text>
                  <Text style={styles.tableCellValue}>{day.totalImpressions}</Text>
                  <Text style={styles.tableCellValue}>{day.uniqueImpressions}</Text>
                  <Text style={styles.tableCellValue}>{day.qualifiedImpressions}</Text>
                  <Text style={styles.tableCellValue}>{day.totalClicks}</Text>
                  <Text style={[styles.tableCellValue, { color: '#4CAF50' }]}>{dayCtr}%</Text>
                </View>
              );
            })}
          </View>
        )}

        {analytics.dailyStats.length === 0 && (
          <View style={styles.noDataWrap}>
            <TrendingUp size={32} color="rgba(191,163,93,0.2)" />
            <Text style={styles.noDataText}>Noch keine Daten vorhanden</Text>
            <Text style={styles.noDataSub}>Sobald die Promotion ausgespielt wird, erscheinen hier die Analytics.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 14,
  },
  emptyText: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 16,
  },
  heroSection: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(191,163,93,0.5)',
    fontWeight: '500' as const,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#BFA35D',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 8,
  },
  kpiCard: {
    width: '48%' as any,
    flexGrow: 1,
    backgroundColor: '#1e1e20',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiValue: {
    color: '#E8DCC8',
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    color: 'rgba(191,163,93,0.6)',
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  kpiSub: {
    color: 'rgba(191,163,93,0.35)',
    fontSize: 11,
    marginTop: 2,
  },
  chartSection: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#1e1e20',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chartTitle: {
    color: '#E8DCC8',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 140,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%' as any,
    justifyContent: 'flex-end',
  },
  barValueWrap: {
    marginBottom: 4,
  },
  barValue: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 9,
    fontWeight: '600' as const,
  },
  barTrack: {
    flex: 1,
    width: '100%' as any,
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    width: '100%' as any,
    borderRadius: 4,
    minHeight: 3,
  },
  barDate: {
    color: 'rgba(191,163,93,0.3)',
    fontSize: 8,
    marginTop: 4,
    fontWeight: '600' as const,
  },
  detailSection: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#1e1e20',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  detailTitle: {
    color: '#E8DCC8',
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.1)',
    paddingBottom: 8,
    marginBottom: 6,
  },
  tableCell: {
    flex: 1,
    color: 'rgba(191,163,93,0.4)',
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  tableDateCell: {
    flex: 1.3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.04)',
  },
  tableCellValue: {
    flex: 1,
    color: '#E8DCC8',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  noDataWrap: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
    gap: 10,
  },
  noDataText: {
    color: '#E8DCC8',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  noDataSub: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 19,
  },
});
