import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, Animated, StyleSheet, Text, Platform, TouchableOpacity } from 'react-native';
import { Sun, Moon, Sunrise, Sunset, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const CITY_LATITUDES: Record<string, number> = {
  'Berlin': 52.52,
  'München': 48.14,
  'Hamburg': 53.55,
  'Köln': 50.94,
  'Frankfurt': 50.11,
  'Stuttgart': 48.78,
  'Düsseldorf': 51.23,
  'Leipzig': 51.34,
  'Dortmund': 51.51,
  'Essen': 51.46,
  'Bremen': 53.08,
  'Dresden': 51.05,
  'Hannover': 52.37,
  'Nürnberg': 49.45,
  'Duisburg': 51.43,
  'Bochum': 51.48,
  'Wuppertal': 51.26,
  'Bielefeld': 52.03,
  'Bonn': 50.73,
  'Münster': 51.96,
  'Karlsruhe': 49.01,
  'Mannheim': 49.49,
  'Augsburg': 48.37,
  'Wiesbaden': 50.08,
  'Mainz': 50.0,
  'Kiel': 54.32,
  'Freiburg': 47.99,
  'Rostock': 54.09,
  'Potsdam': 52.4,
  'Erfurt': 50.98,
  'Magdeburg': 52.13,
  'Schwerin': 53.63,
  'Saarbrücken': 49.23,
  'Wien': 48.21,
  'Zürich': 47.37,
  'Salzburg': 47.81,
  'Graz': 47.07,
  'Innsbruck': 47.26,
  'Linz': 48.31,
  'Bern': 46.95,
  'Regensburg': 49.01,
  'Kassel': 51.31,
  'Lübeck': 53.87,
  'Aachen': 50.78,
  'Chemnitz': 50.83,
  'Halle': 51.48,
  'Braunschweig': 52.27,
  'Osnabrück': 52.28,
  'Wolfsburg': 52.42,
  'Göttingen': 51.53,
  'Ulm': 48.40,
  'Heidelberg': 49.41,
  'Trier': 49.76,
  'Passau': 48.57,
  'Bamberg': 49.89,
  'Würzburg': 49.79,
  'Konstanz': 47.66,
  'Cottbus': 51.76,
  'Jena': 50.93,
  'Weimar': 50.98,
};

const DEFAULT_LAT = 51.0;

const DOT_COUNT = 60;
const DOT_SIZE = 2;
const DOT_RADIUS = 84;
const SUN_ICON_SIZE = 18;
const SUN_HIT_SIZE = 52;
const CONTAINER_SIZE = DOT_RADIUS * 2 + SUN_ICON_SIZE + 8;

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

function getSunTimes(lat: number): { sunrise: number; sunset: number } {
  const dayOfYear = getDayOfYear();
  const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const latRad = (lat * Math.PI) / 180;
  const declRad = (declination * Math.PI) / 180;
  const cosHA = -Math.tan(latRad) * Math.tan(declRad);
  const clamped = Math.max(-1, Math.min(1, cosHA));
  const hourAngle = Math.acos(clamped) * (180 / Math.PI);
  return {
    sunrise: 12 - hourAngle / 15,
    sunset: 12 + hourAngle / 15,
  };
}

function getCurrentHourDecimal(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

function hourToAngleDeg(hour: number): number {
  return ((hour / 24) * 360 + 180) % 360;
}

function angleToHour(angleDeg: number): number {
  return ((angleDeg - 180 + 360) % 360) / 360 * 24;
}

function formatTime(hourDecimal: number): string {
  const h = Math.floor(hourDecimal);
  const m = Math.round((hourDecimal - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getLatForCity(city?: string): number {
  if (!city) return DEFAULT_LAT;
  if (CITY_LATITUDES[city] !== undefined) return CITY_LATITUDES[city];
  const lower = city.toLowerCase();
  for (const [name, lat] of Object.entries(CITY_LATITUDES)) {
    if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) {
      return lat;
    }
  }
  return DEFAULT_LAT;
}

interface SunDialProps {
  residence?: string;
  children: React.ReactNode;
}

export default function SunDial({ residence, children }: SunDialProps) {
  const [currentHour, setCurrentHour] = useState<number>(getCurrentHourDecimal());
  const [showTimes, setShowTimes] = useState<boolean>(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.4)).current;
  const timesOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(getCurrentHourDecimal());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.8, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const lat = useMemo(() => getLatForCity(residence), [residence]);
  const sunTimes = useMemo(() => getSunTimes(lat), [lat]);

  const activeSunAngleDeg = hourToAngleDeg(currentHour);
  const isDaytimeNow = currentHour >= sunTimes.sunrise && currentHour <= sunTimes.sunset;

  const sunAngleRad = (activeSunAngleDeg * Math.PI) / 180;
  const sunX = CONTAINER_SIZE / 2 + DOT_RADIUS * Math.sin(sunAngleRad) - SUN_ICON_SIZE / 2;
  const sunY = CONTAINER_SIZE / 2 - DOT_RADIUS * Math.cos(sunAngleRad) - SUN_ICON_SIZE / 2;

  const sunriseAngle = hourToAngleDeg(sunTimes.sunrise);
  const sunsetAngle = hourToAngleDeg(sunTimes.sunset);

  const toggleTimes = useCallback(() => {
    const next = !showTimes;
    setShowTimes(next);
    Animated.timing(timesOpacity, {
      toValue: next ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('SunDial: toggled info', next);
  }, [showTimes, timesOpacity]);

  const dots = useMemo(() => {
    const items: Array<{
      x: number;
      y: number;
      isDaytime: boolean;
      isSunrise: boolean;
      isSunset: boolean;
    }> = [];

    const sunriseA = hourToAngleDeg(sunTimes.sunrise);
    const sunsetA = hourToAngleDeg(sunTimes.sunset);
    const threshold = 360 / DOT_COUNT;

    for (let i = 0; i < DOT_COUNT; i++) {
      const angleDeg = (i / DOT_COUNT) * 360;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = CONTAINER_SIZE / 2 + DOT_RADIUS * Math.sin(angleRad) - DOT_SIZE / 2;
      const y = CONTAINER_SIZE / 2 - DOT_RADIUS * Math.cos(angleRad) - DOT_SIZE / 2;

      const hour = angleToHour(angleDeg);
      const isDayDot = hour >= sunTimes.sunrise && hour <= sunTimes.sunset;

      const distToSunrise = Math.min(
        Math.abs(angleDeg - sunriseA),
        360 - Math.abs(angleDeg - sunriseA)
      );
      const distToSunset = Math.min(
        Math.abs(angleDeg - sunsetA),
        360 - Math.abs(angleDeg - sunsetA)
      );

      items.push({
        x,
        y,
        isDaytime: isDayDot,
        isSunrise: distToSunrise < threshold,
        isSunset: distToSunset < threshold,
      });
    }

    return items;
  }, [sunTimes]);

  const sunriseRad = (sunriseAngle * Math.PI) / 180;
  const sunriseX = CONTAINER_SIZE / 2 + DOT_RADIUS * Math.sin(sunriseRad) - 4;
  const sunriseY = CONTAINER_SIZE / 2 - DOT_RADIUS * Math.cos(sunriseRad) - 4;

  const sunsetRad = (sunsetAngle * Math.PI) / 180;
  const sunsetX = CONTAINER_SIZE / 2 + DOT_RADIUS * Math.sin(sunsetRad) - 4;
  const sunsetY = CONTAINER_SIZE / 2 - DOT_RADIUS * Math.cos(sunsetRad) - 4;

  const sunriseLabelAngleRad = ((sunriseAngle - 18) * Math.PI) / 180;
  const sunriseLabelX = CONTAINER_SIZE / 2 + (DOT_RADIUS + 22) * Math.sin(sunriseLabelAngleRad);
  const sunriseLabelY = CONTAINER_SIZE / 2 - (DOT_RADIUS + 22) * Math.cos(sunriseLabelAngleRad);

  const sunsetLabelAngleRad = ((sunsetAngle + 18) * Math.PI) / 180;
  const sunsetLabelX = CONTAINER_SIZE / 2 + (DOT_RADIUS + 22) * Math.sin(sunsetLabelAngleRad);
  const sunsetLabelY = CONTAINER_SIZE / 2 - (DOT_RADIUS + 22) * Math.cos(sunsetLabelAngleRad);

  const sunHitX = sunX + SUN_ICON_SIZE / 2 - SUN_HIT_SIZE / 2;
  const sunHitY = sunY + SUN_ICON_SIZE / 2 - SUN_HIT_SIZE / 2;

  return (
    <View
      style={styles.container}
      pointerEvents="box-none"
    >
      {dots.map((dot, i) => {
        const distToSun = Math.min(
          Math.abs((i / DOT_COUNT) * 360 - activeSunAngleDeg),
          360 - Math.abs((i / DOT_COUNT) * 360 - activeSunAngleDeg)
        );
        const isNearSun = distToSun < 12;

        if (isNearSun) return null;

        let dotColor = 'rgba(191,163,93,0.08)';
        let dotSizeLocal = DOT_SIZE;

        if (dot.isSunrise || dot.isSunset) {
          dotColor = 'rgba(217,150,60,0.6)';
          dotSizeLocal = 3;
        } else if (dot.isDaytime) {
          dotColor = 'rgba(191,163,93,0.3)';
        }

        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                left: dot.x - (dotSizeLocal - DOT_SIZE) / 2,
                top: dot.y - (dotSizeLocal - DOT_SIZE) / 2,
                width: dotSizeLocal,
                height: dotSizeLocal,
                borderRadius: dotSizeLocal / 2,
                backgroundColor: dotColor,
              },
            ]}
          />
        );
      })}

      <View style={[styles.sunriseMarker, { left: sunriseX, top: sunriseY }]}>
        <View style={styles.sunriseInner} />
      </View>
      <View style={[styles.sunsetMarker, { left: sunsetX, top: sunsetY }]}>
        <View style={styles.sunsetInner} />
      </View>

      <View style={styles.childContainer} pointerEvents="box-none">
        {children}
      </View>

      <Animated.View
        style={[
          styles.sunGlowWrap,
          {
            left: sunX,
            top: sunY,
            transform: [{ scale: showTimes ? 1.5 : pulseAnim as any }],
            opacity: showTimes ? 0.6 : glowOpacity as any,
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.sunGlow} />
      </Animated.View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggleTimes}
        style={[
          styles.sunHitArea,
          {
            left: sunHitX,
            top: sunHitY,
          },
        ]}
      >
        <View
          style={styles.sunIconInner}
        >
          {isDaytimeNow ? (
            <Sun size={SUN_ICON_SIZE} color={showTimes ? '#F0C040' : '#D4A030'} strokeWidth={2.5} />
          ) : (
            <Moon size={SUN_ICON_SIZE - 2} color={showTimes ? 'rgba(191,163,93,0.8)' : 'rgba(191,163,93,0.5)'} strokeWidth={2} />
          )}
        </View>
      </TouchableOpacity>

      {showTimes && (
        <Animated.View style={[styles.timesOverlay, { opacity: timesOpacity }]} pointerEvents="none">
          <View style={[styles.timeLabel, styles.sunriseLabel, { left: sunriseLabelX - 32, top: sunriseLabelY - 10 }]}>
            <Sunrise size={10} color="#E8A030" />
            <Text style={styles.timeLabelText}>{formatTime(sunTimes.sunrise)}</Text>
          </View>
          <View style={[styles.timeLabel, styles.sunsetLabel, { left: sunsetLabelX - 32, top: sunsetLabelY - 10 }]}>
            <Sunset size={10} color="#D06030" />
            <Text style={styles.timeLabelText}>{formatTime(sunTimes.sunset)}</Text>
          </View>

          <View style={styles.currentTimeTooltip}>
            <Clock size={10} color="#BFA35D" />
            <Text style={styles.currentTimeText}>{formatTime(currentHour)}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    zIndex: 1,
  },
  sunriseMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  sunriseInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(230,140,50,0.5)',
  },
  sunsetMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  sunsetInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(200,100,50,0.5)',
  },
  childContainer: {
    position: 'absolute',
    top: DOT_RADIUS - 50,
    left: DOT_RADIUS - 50,
    right: DOT_RADIUS - 50,
    bottom: DOT_RADIUS - 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  sunGlowWrap: {
    position: 'absolute',
    width: SUN_ICON_SIZE,
    height: SUN_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  sunGlow: {
    width: SUN_ICON_SIZE + 10,
    height: SUN_ICON_SIZE + 10,
    borderRadius: (SUN_ICON_SIZE + 10) / 2,
    backgroundColor: 'rgba(212,160,48,0.15)',
  },
  sunHitArea: {
    position: 'absolute',
    width: SUN_HIT_SIZE,
    height: SUN_HIT_SIZE,
    borderRadius: SUN_HIT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  sunIconInner: {
    width: SUN_ICON_SIZE,
    height: SUN_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timesOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  timeLabel: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20,20,22,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  sunriseLabel: {},
  sunsetLabel: {},
  timeLabelText: {
    color: '#E8DCC8',
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  currentTimeTooltip: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    left: CONTAINER_SIZE / 2 - 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(191,163,93,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  currentTimeText: {
    color: '#BFA35D',
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
});
