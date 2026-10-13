<?php

use Illuminate\Support\Facades\Route;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\PlayersController;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\PlayerActionController;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\InventoryController;
use Pterodactyl\Http\Middleware\Api\Client\Server\AuthenticateServerAccess;
use Pterodactyl\Http\Middleware\Activity\ServerSubject;

Route::get('/servers/{server}/players', PlayersController::class)
    ->middleware([AuthenticateServerAccess::class, 'throttle:20,1,mcplayers:'])
    ->name('api:client:extensions.mcplayers.players');

Route::post('/servers/{server}/players/{player}/actions', PlayerActionController::class)
    ->where('player', '[A-Za-z0-9_]{1,16}')
    ->middleware([AuthenticateServerAccess::class, ServerSubject::class, 'throttle:10,1,mcplayers-actions:'])
    ->name('api:client:extensions.mcplayers.actions');

Route::get('/servers/{server}/players/{player}/inventory', InventoryController::class)
    ->where('player', '[A-Za-z0-9_]{1,16}')
    ->middleware([AuthenticateServerAccess::class, 'throttle:12,1,mcplayers-inventory:'])
    ->name('api:client:extensions.mcplayers.inventory');
