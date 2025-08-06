import { useState, useEffect, memo } from 'react';
import { ArrowLeft, Activity, Monitor, Cpu, MemoryStick, RotateCcw } from 'lucide-react';
import { useFPS } from '../../hooks/useFPS';
import { usePerformanceMetrics } from '../../hooks/usePerformanceMetrics';

interface BenchmarkPageProps {
  onBack: () => void;
}

export const BenchmarkPage = memo(function BenchmarkPage({ onBack }: BenchmarkPageProps) {
  const { metrics: fpsMetrics, resetMetrics, startMeasuring, stopMeasuring } = useFPS();
  const { metrics: perfMetrics, formatBytes, startMonitoring, stopMonitoring } = usePerformanceMetrics();
  const [stressTest, setStressTest] = useState(false);

  useEffect(() => {
    startMeasuring();
    startMonitoring();
    
    return () => {
      stopMeasuring();
      stopMonitoring();
    };
  }, [startMeasuring, stopMeasuring, startMonitoring, stopMonitoring]);

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-600';
    if (fps >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const toggleStressTest = () => {
    setStressTest(!stressTest);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Performance Benchmark</h1>
              <p className="text-gray-600">Monitor FPS e métricas de performance do app</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={resetMetrics}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
            
            <button
              onClick={toggleStressTest}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                stressTest 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Activity size={16} />
              <span>{stressTest ? 'Stop Stress' : 'Stress Test'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Monitor className="text-blue-600" size={20} />
              <h3 className="font-semibold text-gray-900">FPS</h3>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className={`text-3xl font-bold ${getFPSColor(fpsMetrics.fps)}`}>
                {fpsMetrics.fps}
              </div>
              <div className="text-sm text-gray-500">frames/segundo</div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Média</div>
                <div className="font-medium">{fpsMetrics.avgFps}</div>
              </div>
              <div>
                <div className="text-gray-500">Frame Time</div>
                <div className="font-medium">{fpsMetrics.frameTime}ms</div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="text-green-600" size={20} />
              <h3 className="font-semibold text-gray-900">FPS Stats</h3>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Mínimo</div>
                <div className={`font-medium ${getFPSColor(fpsMetrics.minFps)}`}>
                  {fpsMetrics.minFps === Infinity ? 0 : fpsMetrics.minFps}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Máximo</div>
                <div className={`font-medium ${getFPSColor(fpsMetrics.maxFps)}`}>
                  {fpsMetrics.maxFps}
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-gray-500">Samples</div>
              <div className="font-medium">{fpsMetrics.samples}/60</div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div 
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(fpsMetrics.samples / 60) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        {perfMetrics.memory && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <MemoryStick className="text-purple-600" size={20} />
                <h3 className="font-semibold text-gray-900">Memória</h3>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-gray-500 text-sm">Heap Usado</div>
                <div className="text-lg font-bold text-purple-600">
                  {formatBytes(perfMetrics.memory.usedJSHeapSize)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <div className="text-gray-500">Total</div>
                  <div className="font-medium">{formatBytes(perfMetrics.memory.totalJSHeapSize)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Limite</div>
                  <div className="font-medium">{formatBytes(perfMetrics.memory.jsHeapSizeLimit)}</div>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(perfMetrics.memory.usedJSHeapSize / perfMetrics.memory.totalJSHeapSize) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        )}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Cpu className="text-orange-600" size={20} />
              <h3 className="font-semibold text-gray-900">Sistema</h3>
            </div>
          </div>
          
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-gray-500">DOM Nodes</div>
              <div className="font-medium">{perfMetrics.domNodes.toLocaleString()}</div>
            </div>
            
            <div>
              <div className="text-gray-500">Load Time</div>
              <div className="font-medium">{perfMetrics.loadTime}ms</div>
            </div>
            
            <div>
              <div className="text-gray-500">User Agent</div>
              <div className="font-medium text-xs break-all">
                {navigator.userAgent.split(' ').slice(-2).join(' ')}
              </div>
            </div>
          </div>
        </div>
      </div>
      {stressTest && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-4 h-4 bg-blue-500 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});