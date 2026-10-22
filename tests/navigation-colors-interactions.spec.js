import {test,expect} from '@playwright/test';
const ready=async p=>{await p.goto('/');await expect(p.locator('.save-status')).toContainText('Sauvegardé');};
test('zoom au curseur, main et cadrage sans mutation du document',async({page})=>{
 await ready(page);await page.getByRole('button',{name:'+ Rectangle',exact:true}).click();
 const scene=page.locator('.editor-preview'),area=page.locator('.canvas-scroll'),input=page.getByLabel('Zoom en pourcentage');
 const a=await area.boundingBox(),before=await scene.boundingBox(),point={x:a.x+a.width*.6,y:a.y+a.height*.6};
 const nx=(point.x-before.x)/before.width,ny=(point.y-before.y)/before.height;
 await page.mouse.move(point.x,point.y);await page.keyboard.down('Control');await page.mouse.wheel(0,-180);await page.keyboard.up('Control');
 await expect.poll(async()=>Number(await input.inputValue())).toBeGreaterThan(Math.round(before.width/1920*100));
 const after=await scene.boundingBox();expect((point.x-after.x)/after.width).toBeCloseTo(nx,2);expect((point.y-after.y)/after.height).toBeCloseTo(ny,2);
 await page.keyboard.down('Space');await page.mouse.down();await page.mouse.move(point.x+50,point.y+30,{steps:5});await page.mouse.up();await page.keyboard.up('Space');const moved=await scene.boundingBox();expect(moved.x-after.x).toBeCloseTo(50,0);expect(moved.y-after.y).toBeCloseTo(30,0);
 for(const zoom of [50,100,200]){await input.fill(String(zoom));await expect(input).toHaveValue(String(zoom));await expect.poll(async()=>(await scene.boundingBox()).width).toBeCloseTo(1920*zoom/100,0);}
 await page.getByRole('button',{name:'Ajuster la sélection',exact:true}).click();await page.getByRole('button',{name:'Ajuster à l’écran',exact:true}).click();await expect(scene).toBeInViewport({ratio:1});
});
