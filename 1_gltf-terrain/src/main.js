import {
	Clock,
	Scene,
	PerspectiveCamera,
	Mesh,
	SphereGeometry,
	MeshNormalMaterial,
	WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'THREE/examples/jsm/loaders/GLTFLoader.js';
const RAPIER = await import( '@dimforge/rapier3d' );

const state = {
	running: true,
}

// base
const gravity = { x: 0, y: -9.81, z: 0 };
const world = new RAPIER.World( gravity );

const width  = window.innerWidth;
const height = window.innerHeight;
const clock = new Clock();
const scene  = new Scene();
const camera = new PerspectiveCamera( 60, width / height, 0.01, 1000 );
camera.position.set( 0, 2, 8 );
camera.lookAt( 0, 0, 0 );
const renderer = new WebGLRenderer( { stencil: false } );
renderer.setSize( width, height );
document.body.appendChild( renderer.domElement );


// Create the ground
const gltf = await new GLTFLoader().loadAsync( '/terrain.glb' );
const terrainMesh = gltf.scene.children[ 0 ];
terrainMesh.material = new MeshNormalMaterial( { wireframe: true } );
scene.add( terrainMesh );

terrainMesh.updateWorldMatrix( true, true );
terrainMesh.traverse( ( object ) => {

	if ( ! object.isMesh ) return;

	const geometry = object.geometry.clone();

	geometry.applyMatrix4( object.matrix );
	geometry.computeVertexNormals();

	const vertices = new Float32Array( geometry.attributes.position.array );
	const indices = new Uint32Array( geometry.index.array );
	const groundColliderDesc = RAPIER.ColliderDesc.trimesh(
		new Float32Array(vertices),
		new Uint32Array(indices)
	)
	.setActiveEvents( RAPIER.ActiveEvents.COLLISION_EVENTS );

	const groundCollider = world.createCollider( groundColliderDesc );

} );


// Create a dynamic rigid-body.
const radius = 1;
const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
	.setLinearDamping( 0.1 )
	.setTranslation(-1.0, 3.0, 0.0);
const rigidBody = world.createRigidBody(rigidBodyDesc);
// Create a cuboid collider attached to the dynamic rigidBody.
const colliderDesc = RAPIER.ColliderDesc.ball( radius )
	.setFriction(0.1)
	.setFrictionCombineRule( RAPIER.CoefficientCombineRule.Max )
	.setRestitution(0.6)
	.setRestitutionCombineRule( RAPIER.CoefficientCombineRule.Max );
const collider = world.createCollider( colliderDesc, rigidBody );

const ballMesh = new Mesh(
	new SphereGeometry( radius, 16, 16 ),
	new MeshNormalMaterial( { wireframe: true } )
);
scene.add( ballMesh );


// Game loop. Replace by your own game loop system.
( function gameLoop() {

	if ( ! state.running ) return;

	// Ste the simulation forward.
	world.step();

	// Get and print the rigid-body's position.
	ballMesh.position.copy( rigidBody.translation() );
	ballMesh.quaternion.copy( rigidBody.rotation() );
	// console.log("Rigid-body position: ", position.x, position.y, position.z);

	setTimeout( gameLoop, 16 );

} )();

( function renderLoop () {

	// const delta = clock.getDelta();
	const elapsed = clock.getElapsedTime();
	// const hasControlsUpdated = cameraControls.update( delta );

	if ( elapsed > 30 ) state.running = false;

	requestAnimationFrame( renderLoop );
	renderer.render( scene, camera );

} )();

window.addEventListener( 'resize', function () {

	const width	= window.innerWidth;
	const height = window.innerHeight;

	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	renderer.setSize( width, height );

} );

