import {test,expect} from '@playwright/test';

test('Fichier : clavier, fermeture et commandes existantes',async({page})=>{
 await page.goto('/');await expect(page.locator('.save-status')).toContainText('Sauvegardé');
 const trigger=page.getByRole('button',{name:'Fichier',exact:true}),menu=page.getByRole('menu',{name:'Fichier',exact:true});
 await expect(page.getByRole('button',{name:'Sauvegarder mon projet',exact:true})).toHaveCount(0);
 await trigger.focus();await page.keyboard.press('Enter');
 const save=menu.getByRole('menuitem',{name:'Sauvegarder mon projet',exact:true});
 await expect(save).toBeFocused();await page.keyboard.press('ArrowDown');await expect(menu.getByRole('menuitem',{name:'Importer un ZIP',exact:true})).toBeFocused();
 await page.keyboard.press('End');await expect(menu.getByRole('menuitem',{name:'Protéger le stockage local',exact:true})).toBeFocused();
 await expect(menu.getByRole('menuitem',{name:'Récupérer le projet précédent',exact:true})).toBeDisabled();
 await page.keyboard.press('ArrowDown');await expect(save).toBeFocused();
 await page.keyboard.press('Escape');await expect(menu).toHaveCount(0);await expect(trigger).toBeFocused();
 await trigger.click();await page.locator('.workspace-document').click();await expect(menu).toHaveCount(0);
 await trigger.focus();await page.keyboard.press('ArrowUp');await expect(menu.getByRole('menuitem',{name:'Protéger le stockage local',exact:true})).toBeFocused();await page.keyboard.press('Home');await expect(save).toBeFocused();await page.keyboard.press('Tab');await expect(menu).toHaveCount(0);await expect(page.getByRole('button',{name:'▶ Lancer la présentation',exact:true})).toBeFocused();
 await trigger.click();const chooser=page.waitForEvent('filechooser');await menu.getByRole('menuitem',{name:'Importer un ZIP',exact:true}).click();expect((await chooser).isMultiple()).toBe(false);await expect(menu).toHaveCount(0);
 await trigger.click();const download=page.waitForEvent('download');await menu.getByRole('menuitem',{name:'Sauvegarder mon projet',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.zip$/);await expect(menu).toHaveCount(0);
 await page.evaluate(()=>{window.persistCalls=0;navigator.storage.persist=async()=>{window.persistCalls++;return true;};});
 await trigger.click();await menu.getByRole('menuitem',{name:'Protéger le stockage local',exact:true}).click();await expect(menu).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>window.persistCalls)).toBe(1);
 await page.setViewportSize({width:390,height:844});await trigger.click();await expect(menu).toBeVisible();const bounds=await menu.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
});
