import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { RapierRaycastVehicle } from './lib/rapier-raycast-vehicle';

await RAPIER.init();

const state = {
	running: true,
};

// based on
// https://github.com/isaac-mason/sketches/blob/main/src/sketches/rapier/raycast-vehicle/lib/rapier-raycast-vehicle.ts

// base
const gravity = { x: 0, y: -9.81, z: 0 };
const world = new RAPIER.World( gravity );

const width  = window.innerWidth;
const height = window.innerHeight;
const clock = new THREE.Clock();
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, width / height, 0.01, 1000 );
camera.position.set( 0, 2, 10 );
camera.lookAt( 0, 0, 0 );
const renderer = new THREE.WebGLRenderer( { stencil: false } );
renderer.setSize( width, height );
document.body.appendChild( renderer.domElement );


const groundMesh = new THREE.Mesh(
	new THREE.BoxGeometry( 20, 0.1, 20 ),
	new THREE.MeshNormalMaterial( { wireframe: false } )
);
groundMesh.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), 0 * THREE.MathUtils.DEG2RAD );
scene.add( groundMesh );

const groundRigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
const groundRigidBody = world.createRigidBody(groundRigidBodyDesc);
const groundColliderDesc = RAPIER.ColliderDesc.cuboid(
	groundMesh.geometry.parameters.width / 2,
	groundMesh.geometry.parameters.height / 2,
	groundMesh.geometry.parameters.depth / 2
);
groundColliderDesc.setTranslation( groundMesh.position.x, groundMesh.position.y, groundMesh.position.z );
groundColliderDesc.setRotation( new RAPIER.Quaternion( groundMesh.quaternion.x, groundMesh.quaternion.y, groundMesh.quaternion.z, groundMesh.quaternion.w ) );
world.createCollider( groundColliderDesc, groundRigidBody );

const obstacleMesh = new THREE.Mesh(
	new THREE.BoxGeometry( 5, 5, 5 ),
	new THREE.MeshNormalMaterial( { wireframe: true } )
);
console.log( obstacleMesh.geometry.parameters.width );

obstacleMesh.position.set( 6, 0, -2 );
obstacleMesh.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), 60 * THREE.MathUtils.DEG2RAD );
scene.add( obstacleMesh );

const obstacleRigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
const obstacleRigidBody = world.createRigidBody(obstacleRigidBodyDesc);
const obstacleColliderDesc = RAPIER.ColliderDesc.cuboid(
	obstacleMesh.geometry.parameters.width / 2,
	obstacleMesh.geometry.parameters.height / 2,
	obstacleMesh.geometry.parameters.depth / 2
);
obstacleColliderDesc.setTranslation( obstacleMesh.position.x, obstacleMesh.position.y, obstacleMesh.position.z );
obstacleColliderDesc.setRotation( new RAPIER.Quaternion( obstacleMesh.quaternion.x, obstacleMesh.quaternion.y, obstacleMesh.quaternion.z, obstacleMesh.quaternion.w ) );
world.createCollider( obstacleColliderDesc, obstacleRigidBody );


// const carLength = 4;
// const carWidth = 1.6;
// const carHeight = 1.7;
// const wheelRadius = 0.3;
// const wheelWidth = 0.3;

const chassisRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
const chassisRigidBody = world.createRigidBody(chassisRigidBodyDesc);
chassisRigidBody.setTranslation( new THREE.Vector3( 0, 4, 0 ), true );
// chassisRigidBody.setRotation( new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI / 2 ), true );

const halfExtents = [ 2.35, 0.55, 1 ] as const;
const chassisColliderDesc = RAPIER.ColliderDesc.cuboid( ...halfExtents ).setMass( 150 );
const chassisCollider = world.createCollider( chassisColliderDesc, chassisRigidBody );

const chassisMesh = new THREE.Mesh(
	new THREE.BoxGeometry( halfExtents[ 0 ] * 2, halfExtents[ 1 ] * 2, halfExtents[ 2 ] * 2 ),
	new THREE.MeshBasicMaterial( { wireframe: true } )
);
chassisMesh.geometry.rotateX( Math.PI / 2 );
scene.add( chassisMesh );

const indexRightAxis = 2;
const indexForwardAxis = 0;
const indexUpAxis = 1;
const vehicle = new RapierRaycastVehicle( {
	world,
	chassisRigidBody,
	indexRightAxis,
	indexForwardAxis,
	indexUpAxis,
} );

const commonWheelOptions = {
	radius: 0.38,

	directionLocal: new THREE.Vector3( 0, - 1, 0 ),
	axleLocal: new THREE.Vector3( 0, 0, 1 ),

	suspensionStiffness: 30,
	suspensionRestLength: 0.3,
	maxSuspensionForce: 100000,
	maxSuspensionTravel: 0.3,

	sideFrictionStiffness: 1,
	frictionSlip: 1.4,
	dampingRelaxation: 2.3,
	dampingCompression: 4.4,

	rollInfluence: 0.01,

	customSlidingRotationalSpeed: -30,
	useCustomSlidingRotationalSpeed: true,

	forwardAcceleration: 1,
	sideAcceleration: 1,
};

const vehicleWidth = 1.7;
const vehicleHeight = -0.5;
const vehicleFront = -1.35;
const vehicleRear = 1.3;

const wheels = [
	{
			// topLeft,
			options: {
					...commonWheelOptions,
					chassisConnectionPointLocal: new THREE.Vector3(vehicleRear, vehicleHeight, vehicleWidth * 0.5),
			},
	},
	{
			// topRight,
			options: {
					...commonWheelOptions,
					chassisConnectionPointLocal: new THREE.Vector3(vehicleRear, vehicleHeight, vehicleWidth * -0.5),
			},
	},
	{
			// bottomLeft,
			options: {
					...commonWheelOptions,
					chassisConnectionPointLocal: new THREE.Vector3(vehicleFront, vehicleHeight, vehicleWidth * 0.5),
			},
	},
	{
			// bottomRight,
			options: {
					...commonWheelOptions,
					chassisConnectionPointLocal: new THREE.Vector3(vehicleFront, vehicleHeight, vehicleWidth * -0.5),
			},
	},
]

for (let i = 0; i < wheels.length; i++) {
	const options = wheels[ i ].options
	vehicle.addWheel( options )
}



const wheelWidth = .3;
const carWheelFrontRightMesh = new THREE.Mesh(
	new THREE.CylinderGeometry( commonWheelOptions.radius, commonWheelOptions.radius, wheelWidth, 16 ),
	new THREE.MeshBasicMaterial( { wireframe: true } )
);
carWheelFrontRightMesh.geometry.rotateX( Math.PI / 2 );
const carWheelFrontLeftMesh = carWheelFrontRightMesh.clone();
const carWheelRearRightMesh = carWheelFrontRightMesh.clone();
const carWheelRearLeftMesh = carWheelFrontRightMesh.clone();
scene.add( carWheelFrontRightMesh, carWheelFrontLeftMesh, carWheelRearRightMesh, carWheelRearLeftMesh );



const keyConfig = {
	forward: [ 'KeyW', 'ArrowUp' ],
	backward: [ 'KeyS', 'ArrowDown' ],
	left: [ 'KeyA', 'ArrowLeft' ],
	right: [ 'KeyD', 'ArrowRight' ],
	brake: [ 'Space' ],
};

const controls = {
	backward: false,
	forward: false,
	left: false,
	right: false,
	brake: false,
}

window.addEventListener( 'keydown', ( event ) => {

	if ( keyConfig.forward.includes( event.code ) ) controls.forward = true;
	if ( keyConfig.backward.includes( event.code ) ) controls.backward = true;
	if ( keyConfig.left.includes( event.code ) ) controls.left = true;
	if ( keyConfig.right.includes( event.code ) ) controls.right = true;
	if ( keyConfig.brake.includes( event.code ) ) controls.brake = true;

} );

window.addEventListener( 'keyup', ( event ) => {

	if ( keyConfig.forward.includes( event.code ) ) controls.forward = false;
	if ( keyConfig.backward.includes( event.code ) ) controls.backward = false;
	if ( keyConfig.left.includes( event.code ) ) controls.left = false;
	if ( keyConfig.right.includes( event.code ) ) controls.right = false;
	if ( keyConfig.brake.includes( event.code ) ) controls.brake = false;

} );


const maxForce = 80;
const maxSteer = 10;
const maxBrake = 80;

const updateKeyInput = ( vehicle: RapierRaycastVehicle ) => {

	// update wheels from controls
	let engineForce = 0
	let steering = 0

	if ( controls.forward ) engineForce += maxForce;
	if ( controls.backward ) engineForce -= maxForce;
	if ( controls.left ) steering += maxSteer;
	if ( controls.right ) steering -= maxSteer;

	const brakeForce = controls.brake ? maxBrake : 0;

	for ( let i = 0; i < vehicle.wheels.length; i ++ ) {

		vehicle.setBrakeValue( brakeForce, i );

	}

	// steer front wheels
	vehicle.setSteeringValue( steering, 0 );
	vehicle.setSteeringValue( steering, 1 );

	// apply engine force to back wheels
	vehicle.applyEngineForce( engineForce, 2 );
	vehicle.applyEngineForce( engineForce, 3 );

};

// @ts-ignore
// debug: expose for console checking
window.vehicle = vehicle;


( function gameLoop() {

	if ( ! state.running ) return;

	// const engineForce = 30;
	// vehicle.setSteeringValue( 0, 0 );
	// vehicle.setSteeringValue( 0, 1 );
	// vehicle.applyEngineForce( engineForce, 2 );
	// vehicle.applyEngineForce( engineForce, 3 );
	updateKeyInput( vehicle );
	vehicle.update( 16 / 1000 );
	world.step();

	const chassisRigidBodyRotation = vehicle.chassisRigidBody.rotation();
	const chassisRigidBodyPosition = vehicle.chassisRigidBody.translation();
	chassisMesh.quaternion.set( chassisRigidBodyRotation.x, chassisRigidBodyRotation.y, chassisRigidBodyRotation.z, chassisRigidBodyRotation.w );
	chassisMesh.position.set( chassisRigidBodyPosition.x, chassisRigidBodyPosition.y, chassisRigidBodyPosition.z );

	carWheelFrontRightMesh.quaternion.copy( vehicle.wheels[0].state.worldTransform.quaternion );
	carWheelFrontRightMesh.position.copy( vehicle.wheels[0].state.worldTransform.position );
	carWheelFrontLeftMesh.quaternion.copy( vehicle.wheels[1].state.worldTransform.quaternion );
	carWheelFrontLeftMesh.position.copy( vehicle.wheels[1].state.worldTransform.position );
	carWheelRearRightMesh.quaternion.copy( vehicle.wheels[2].state.worldTransform.quaternion );
	carWheelRearRightMesh.position.copy( vehicle.wheels[2].state.worldTransform.position );
	carWheelRearLeftMesh.quaternion.copy( vehicle.wheels[3].state.worldTransform.quaternion );
	carWheelRearLeftMesh.position.copy( vehicle.wheels[3].state.worldTransform.position );

	setTimeout( gameLoop, 16 );

} )();

( function renderLoop () {

	// const delta = clock.getDelta();
	const elapsed = clock.getElapsedTime();
	// const hasControlsUpdated = cameraControls.update( delta );

	if ( elapsed > 60 ) state.running = false;

	requestAnimationFrame( renderLoop );
	renderer.render( scene, camera );

} )();
