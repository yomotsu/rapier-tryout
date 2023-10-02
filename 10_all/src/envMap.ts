import { PMREMGenerator, SRGBColorSpace, TextureLoader, WebGLRenderTarget } from "three";
import type { WebGLRenderer } from "three";

const envMaps = new WeakMap();

export const loadEnvMap = ( renderer: WebGLRenderer, url: string ): Promise<WebGLRenderTarget> => {

	return new Promise( ( resolve ) => {

		const envMap = envMaps.get( renderer );
		if ( envMap && envMap instanceof WebGLRenderTarget ) {

			resolve( envMap );
			return;

		}

		new TextureLoader().load( url, ( equirectangularMap ) => {

			const pmremGenerator = new PMREMGenerator( renderer );
			pmremGenerator.compileEquirectangularShader();
			const envMap = pmremGenerator.fromEquirectangular( equirectangularMap );
			envMap.texture.colorSpace = SRGBColorSpace;
			equirectangularMap.dispose();
			resolve( envMap );
			return;

		} );

	} );

};
