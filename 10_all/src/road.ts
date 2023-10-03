import * as THREE from 'three';
import { RoadGeometry } from './lib/road-geometry';

const heightScale = 1;

const curvePath: THREE.CurvePath<THREE.Vector3> = new THREE.CurvePath();
curvePath.add( new THREE.CatmullRomCurve3( [
	new THREE.Vector3( 0, 0 * heightScale, 0 ),
	new THREE.Vector3( 0, 0 * heightScale, 0.1 ),
	new THREE.Vector3( 0, 0 * heightScale, 10 ),
	new THREE.Vector3( 0, 18 * heightScale, 50 ),
	new THREE.Vector3( 20, 18 * heightScale, 60 ),
	new THREE.Vector3( 20, 18 * heightScale, 0 ),
	new THREE.Vector3( 0, 18 * heightScale, 0 ),
	new THREE.Vector3( -10, 18 * heightScale, 0 ),
	new THREE.Vector3( -50, 0 * heightScale, -50 ),
	new THREE.Vector3( 0, 0 * heightScale, -50 ),
	new THREE.Vector3( 0, 0 * heightScale, -10 ),
] ) );

const colorMap = new THREE.TextureLoader().load( './road-color.webp' );
const normalMap = new THREE.TextureLoader().load( './road-normal.webp' );
const roughnessMap = new THREE.TextureLoader().load( './road-roughness.webp' );

colorMap.repeat.set( 1, 20 );
colorMap.wrapT = THREE.RepeatWrapping;
colorMap.colorSpace = THREE.SRGBColorSpace;
normalMap.repeat.copy( colorMap.repeat );
normalMap.wrapT = colorMap.wrapT;
normalMap.colorSpace = THREE.SRGBColorSpace;
roughnessMap.repeat.copy( colorMap.repeat );
roughnessMap.wrapT = colorMap.wrapT;
roughnessMap.colorSpace = THREE.SRGBColorSpace;

export const roadMesh = new THREE.Mesh(
	new RoadGeometry( curvePath, 120, 10, true ),
	// new THREE.MeshNormalMaterial(),
	new THREE.MeshStandardMaterial( {
		map: colorMap,
		normalMap,
		roughnessMap,
		side: THREE.DoubleSide
	} ),
);
