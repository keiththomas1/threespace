import PlayerUtils from "./utils/playerUtils";

export default class ARButton {

	public static CreateButton( renderer: THREE.WebGLRenderer ) {
		const button = document.createElement( 'button' );
		let sessionInit: XRSessionInit = {};

		function ShowStartAR() {
			if ( sessionInit.domOverlay === undefined ) {

				const overlay = document.createElement( 'div' );
				overlay.style.display = 'none';
				document.body.appendChild( overlay );

				const svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
				svg.setAttribute( 'width', "38" );
				svg.setAttribute( 'height', "38" );
				svg.style.position = 'absolute';
				svg.style.right = '20px';
				svg.style.top = '20px';
				svg.addEventListener( 'click', function () {

					currentSession.end();

				} );
				overlay.appendChild( svg );

				const path = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
				path.setAttribute( 'd', 'M 12,12 L 28,28 M 28,12 12,28' );
				path.setAttribute( 'stroke', '#fff' );
				path.setAttribute( 'stroke-width', "2" );
				svg.appendChild( path );

				if ( sessionInit.optionalFeatures === undefined ) {

					sessionInit.optionalFeatures = [];

				}

				sessionInit.optionalFeatures.push( 'dom-overlay' );
				sessionInit.domOverlay = { root: overlay };

			}

			//

			let currentSession = null;

			async function onSessionStarted( session ) {

				session.addEventListener( 'end', onSessionEnded );

				renderer.xr.setReferenceSpaceType( 'local' );

				await renderer.xr.setSession( session );

				button.textContent = 'STOP AR';
        const htmlElement = sessionInit.domOverlay.root as HTMLElement;
				htmlElement.style.display = '';

				currentSession = session;

			}

			function onSessionEnded( /*event*/ ) {

				currentSession.removeEventListener( 'end', onSessionEnded );

				button.textContent = 'START AR';
        const htmlElement = sessionInit.domOverlay.root as HTMLElement;
				htmlElement.style.display = 'none';

				currentSession = null;

			}

			//

			button.style.display = '';

			button.style.cursor = 'pointer';
			button.style.left = 'calc(50% - 50px)';
			button.style.width = '100px';

			button.textContent = 'START AR';

			button.onmouseenter = function () {

				button.style.opacity = '1.0';

			};

			button.onmouseleave = function () {

				button.style.opacity = '0.5';

			};

			button.onclick = function () {

				if ( currentSession === null ) {

					navigator.xr.requestSession( 'immersive-ar', sessionInit ).then( onSessionStarted );

				} else {

					currentSession.end();

				}

			};

		}

		function DisableButton() {
      button.style.visibility = "hidden";

			button.onmouseenter = null;
			button.onmouseleave = null;

			button.onclick = null;

		}

		function ShowARNotSupported() {

			DisableButton();

			button.textContent = 'AR NOT SUPPORTED';

		}

		function ShowARNotAllowed( exception ) {

			DisableButton();

			console.warn( 'Exception when trying to call xr.isSessionSupported', exception );

			button.textContent = 'AR NOT ALLOWED';

		}

		function StylizeElement( element ) {

			element.style.position = 'absolute';
			element.style.bottom = '20px';
			element.style.padding = '12px 6px';
			element.style.border = '1px solid #fff';
			element.style.borderRadius = '4px';
			element.style.background = 'rgba(0,0,0,0.1)';
			element.style.color = '#fff';
			element.style.font = 'normal 13px sans-serif';
			element.style.textAlign = 'center';
			element.style.opacity = '0.5';
			element.style.outline = 'none';
			element.style.zIndex = '999';

		}

		if ( 'xr' in navigator && PlayerUtils.IsMobile(navigator) ) {

			button.id = 'ARButton';
			button.style.display = 'none';

			StylizeElement( button );

			navigator.xr.isSessionSupported( 'immersive-ar' ).then( function ( supported ) {

				supported ? ShowStartAR() : ShowARNotSupported();

			} ).catch( ShowARNotAllowed );

			return button;

		} else {

			if ( window.isSecureContext === false ) {
				console.warn("WebXR needs HTTPS");
			}

			DisableButton();

			return null;
		}
	}
}