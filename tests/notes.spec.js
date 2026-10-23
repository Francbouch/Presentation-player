import {test,expect} from '@playwright/test';
import JSZip from 'jszip';
import fs from 'node:fs/promises';
const saved=p=>expect(p.locator('.save-status')).toContainText('Sauvegardé');
test('notes privées : pages, clavier, rechargement et véritable ZIP',async({page})=>{
 await page.goto('/');await saved(page);
 await page.getByRole('button',{name:'Notes',exact:true}).click();
 const text=page.getByRole('textbox',{name:'Texte des notes'});
 await text.fill('Introduction éèêàçœ\n• **Mobilier**');await saved(page);
 await text.press('Control+a');await text.press('Control+c');await text.press('End');await text.press('Enter');await text.press('Control+v');await expect(text).toContainText('');
 await text.fill('Introduction éèêàçœ\n• **Mobilier**');await saved(page);
 await page.locator('.page-thumbnail').nth(1).click();await expect(text).toHaveValue('');await text.fill('Deuxième discours');await saved(page);
 await page.locator('.page-thumbnail').first().click();await expect(text).toHaveValue('Introduction éèêàçœ\n• **Mobilier**');
 await page.getByRole('button',{name:'Fermer les notes'}).click();await expect(text).toHaveCount(0);await page.getByRole('button',{name:'Notes',exact:true}).click();await expect(text).toHaveValue('Introduction éèêàçœ\n• **Mobilier**');
 await page.reload();await saved(page);await page.getByRole('button',{name:'Notes',exact:true}).click();await expect(text).toHaveValue('Introduction éèêàçœ\n• **Mobilier**');
 await page.getByRole('button',{name:'Fichier',exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('menuitem',{name:'Sauvegarder mon projet',exact:true}).click();const file=await(await download).path();const zip=await JSZip.loadAsync(await fs.readFile(file));const json=Object.values(zip.files).find(f=>f.name.endsWith('.json'));const config=JSON.parse(await json.async('string'));expect(config.pages[0].notes).toContain('Introduction');
 await text.fill('Remplacé');await saved(page);await page.getByTestId('zip-input').setInputFiles(file);await page.getByRole('button',{name:'Confirmer',exact:true}).click();await saved(page);await expect(text).toHaveValue('Introduction éèêàçœ\n• **Mobilier**');
 await page.getByRole('button',{name:'Présentation',exact:true}).click();await expect(page.getByText('Introduction éèêàçœ',{exact:false})).toHaveCount(0);
});
