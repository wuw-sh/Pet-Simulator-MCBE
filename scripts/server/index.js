import * as $server from '@minecraft/server';
import * as $form from '@minecraft/server-ui';
const $PetList = {
    Cat: 'minecraft:cat',
    Chicken: 'minecraft:chicken',
    Cow: 'minecraft:cow',
    Bat: 'minecraft:bat',
};
function getAllPet($player) {
    return Object.keys($PetList).map($pet => {
        const $petData = JSON.parse($server.world.getDynamicProperty(`pet:${$pet}`));
        if (!$petData)
            $server.world.setDynamicProperty(`pet:${$pet}`, JSON.stringify({}));
        return Object.keys($petData).map($data => {
            if ($petData[$data] !== $player.name)
                return;
            const $entity = $player.dimension.getEntities().find($entity => $entity.id === $data);
            if (!$entity) {
                delete $petData[$data];
                return $server.world.setDynamicProperty(`pet:${$pet}`, JSON.stringify($petData));
            }
            return $entity;
        });
    }).flat().flat().filter($pet => $pet);
}
$server.system.runInterval(() => {
    for (const $player of $server.world.getPlayers()) {
        const $pets = getAllPet($player).map((_, $index, $arr) => $index % 3 === 0 ? $arr.slice($index, $index + 3) : 0).filter(Boolean);
        const $loc = $player.location;
        const $rot = $player.getRotation();
        const $d = -$rot.y + 180;
        for (const $pet_member of $pets) {
            const $row = $pets.indexOf($pet_member) + 1;
            const $row_n = $pet_member.length;
            for (const $pet of $pet_member) {
                const $column = $pet_member.indexOf($pet) + 1;
                const $d1 = $row_n === 2 ? $d + (90 * (-1) ** $column) : $row_n === 3 ? $column === 1 ? $d - 90 : $column === 2 ? $d : $d + 90 : 0;
                const $s = 1.5 * $row;
                const $s1 = $row_n === 1 ? 0 : $row_n === 2 ? .5 : $row_n === 3 ? $column === 1 ? 1 : $column === 2 ? 0 : 1 : 0;
                const $x = $loc.x + (Math.sin($d * Math.PI / 180) * $s) + (Math.sin($d1 * Math.PI / 180) * $s1);
                const $z = $loc.z + (Math.cos($d * Math.PI / 180) * $s) + (Math.cos($d1 * Math.PI / 180) * $s1);
                $pet.teleport({ x: $x, y: $loc.y, z: $z }, $player.dimension, $rot.x, $rot.y, true);
            }
        }
    }
});
$server.world.events.worldInitialize.subscribe($ev => {
    const $def = new $server.DynamicPropertiesDefinition();
    for (const $pet in $PetList) {
        $def.defineString(`pet:${$pet}`, 4294967295);
    }
    $ev.propertyRegistry.registerWorldDynamicProperties($def);
});
$server.world.events.beforeItemUse.subscribe($ev => {
    const $player = $ev.source;
    if (!($player instanceof $server.Player))
        return;
    const $item = $ev.item;
    if ($item.typeId === 'minecraft:clock') {
        for (const $pet in $PetList) {
            $server.world.setDynamicProperty(`pet:${$pet}`, JSON.stringify({}));
        }
        return;
    }
    if ($item.typeId !== 'minecraft:compass')
        return;
    $ev.cancel = true;
    new $form.ActionFormData()
        .title('Pet Menu')
        .button('Spawner Pets')
        .button('§cRemove Pets')
        .show($player).then($res => {
        if ($res.canceled)
            return;
        switch ($res.selection) {
            case 0: {
                const $spawnerPets = new $form.ActionFormData().title('Spawner Pets');
                for (const $pet in $PetList) {
                    $spawnerPets.button($pet);
                }
                $spawnerPets.show($player).then($res => {
                    if ($res.canceled)
                        return;
                    if ($res.selection === undefined)
                        return;
                    const $entity = $player.dimension.spawnEntity(Object.values($PetList)[$res.selection], $player.location);
                    const $pet = Object.keys($PetList)[$res.selection];
                    const $petData = JSON.parse($server.world.getDynamicProperty(`pet:${$pet}`));
                    $petData[$entity.id] = $player.name;
                    $server.world.setDynamicProperty(`pet:${$pet}`, JSON.stringify($petData));
                });
                break;
            }
            case 1: {
                const $pets = getAllPet($player);
                if ($pets.length === 0)
                    return $player.sendMessage('§cYou have no pets');
                const $removePets = new $form.ActionFormData().title('Remove Pets');
                for (const $pet of $pets) {
                    if (!$pet)
                        continue;
                    $removePets.button($pet.typeId);
                }
                $removePets.show($player).then($res => {
                    if ($res.canceled)
                        return;
                    if ($res.selection === undefined)
                        return;
                    const $entity = $pets[$res.selection];
                    if (!$entity)
                        return;
                    const petDataName = Object.keys($PetList).find($pet => $PetList[$pet] === $pets[$res?.selection ?? 0]?.typeId);
                    const $petData = JSON.parse($server.world.getDynamicProperty(`pet:${petDataName}`));
                    delete $petData[$entity.id];
                    $server.world.setDynamicProperty(`pet:${petDataName}`, JSON.stringify($petData));
                    $entity.kill();
                });
                break;
            }
            default: return console.warn('Invalid selection');
        }
    });
});
