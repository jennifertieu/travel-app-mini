import { useLocation } from './hooks/useLocation';
import { MapView } from './components/MapView';
import { NotificationDemo } from './components/NotificationDemo';

const App = () => {
  const {
    position,
    isLoading,
    error,
    permissionStatus,
    requestLocation,
    clearError,
  } = useLocation();

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">During Trip</h1>
        <p className="app-subtitle">AI-powered travel assistant</p>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Notification Demo */}
        <NotificationDemo />

        {/* Location Section */}
        <div className="location-section">
          <div className="location-header">
            <h2 className="section-title">Your Location</h2>
            {position && (
              <div className="location-info">
                <span className="location-coords">
                  {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                </span>
                <span className="location-accuracy">
                  ±{position.accuracy.toFixed(0)}m
                </span>
              </div>
            )}
          </div>

          {/* Location Controls */}
          <div className="location-controls">
            <button
              onClick={requestLocation}
              disabled={isLoading || permissionStatus === 'denied'}
              className={`btn btn-primary ${isLoading ? 'btn-loading' : ''}`}
            >
              {isLoading ? 'Getting Location...' : position ? 'Refresh Location' : 'Get My Location'}
            </button>

            {permissionStatus === 'denied' && (
              <p className="error-message">
                Location access denied. Please enable it in your browser settings.
              </p>
            )}

            {error && (
              <div className="error-banner">
                <p className="error-text">{error}</p>
                <button onClick={clearError} className="btn btn-sm">
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Map View */}
          <div className="map-container">
            {!position && !isLoading && (
              <div className="map-placeholder">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <p>Tap "Get My Location" to see your position on the map</p>
              </div>
            )}
            {(position || isLoading) && (
              <MapView location={position} />
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="info-section">
          <h3 className="info-title">PWA Features Enabled</h3>
          <ul className="feature-list">
            <li className="feature-item">
              <span className="feature-icon">📍</span>
              <span>Real-time geolocation tracking</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">🔔</span>
              <span>Push notifications support</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">🗺️</span>
              <span>Interactive Mapbox integration</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">📱</span>
              <span>Installable as mobile app</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>Service worker caching</span>
            </li>
          </ul>
        </div>

        {/* Development Info */}
        <div className="dev-info">
          <p className="dev-text">
            <strong>Note:</strong> Make sure to set <code>VITE_MAPBOX_TOKEN</code> in your{' '}
            <code>.env.local</code> file to use Mapbox maps.
          </p>
          <p className="dev-text">
            Get your free token at{' '}
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="dev-link"
            >
              mapbox.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default App;
