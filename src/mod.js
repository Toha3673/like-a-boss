const BClass = require("C:/snapshot/project/obj/models/enums/BaseClasses");
const LTColor = require("C:/snapshot/project/obj/models/spt/logging/LogTextColor");

class like_a_boss {
    CFG;
    Logger;
    DataBase;
    JsonUtil;
    RandomUtil;
    BotHelper;
    BotGenerator;
    PlayerScavGenerator;
    SRMService;
    SaveServer;
    HashGen;
    postDBLoad(container) {
        this.CFG = require("../config/config.json");
        this.Logger = container.resolve("WinstonLogger");
        this.DataBase = container.resolve("DatabaseServer");
        this.JsonUtil = container.resolve("JsonUtil");
        this.RandomUtil = container.resolve("RandomUtil");
        this.BotHelper = container.resolve("BotHelper");
        this.BotGenerator = container.resolve("BotGenerator");
        this.PlayerScavGenerator = container.resolve("PlayerScavGenerator");
        this.SRMService = container.resolve("StaticRouterModService");
        this.SaveServer = container.resolve("SaveServer");
        this.HashGen = container.resolve("HashUtil");

        const props = {"IsUnbuyable": true, "IsUndiscardable": true, "IsUngivable": true, "IsUnremovable": true, "IsUnsaleable": true, "NotShownInSlot": true, "ExaminedByDefault": true}

        this.generateItemCopy("5732ee6a24597719ae0c0281", "likeaboss_scavpouch", props);

        const exotic = this.CFG.exotic_items_list
        for (const value of exotic) {
            this.generateItemCopy(value, `likeaboss_${value}`, props);
        }

        this.Logger.log("[like-a-boss] has been loaded.", LTColor.LogTextColor.CYAN);
    }
    preAkiLoad(container) {
        const staticroutermodservice = container.resolve("StaticRouterModService");
        staticroutermodservice.registerStaticRouter("LikeABoss_Game_Start", [{
            url: "/client/game/start",
            action: (url, info, sessionID, output) => {
                if (this.CFG.reroll_on_game_start)
                {
                    this.regenerateScavProfile(sessionID);
                }
                return output;
            }
        }],
        "aki");
        staticroutermodservice.registerStaticRouter("LikeABoss_Profile_Save", [{
            url: "/raid/profile/save",
            action: (url, info, sessionID, output) => {
                if (info.isPlayerScav && info.exit != "survived" && info.exit != "runner") {
                    this.regenerateScavProfile(sessionID);
                }
                return output;
            }
        }],
        "aki");
        staticroutermodservice.registerStaticRouter("LikeABoss_Savage_Regenerate", [{
            url: "/client/game/profile/savage/regenerate",
            action: (url, info, sessionID, output) => {
                this.regenerateScavProfile(sessionID);
                return output;
            }
        }],
        "aki");
    }

    regenerateScavProfile(sessionID)
    {
        const profile = this.SaveServer.getProfile(sessionID);
        const scavKarmaLevel = this.getScavKarmaLevel(profile.characters.pmc);
        const chance = this.CFG.boss_chances[scavKarmaLevel-1]
        const random = this.RandomUtil.getInt(1, 100)
        if (random <= chance) {
            this.Logger.log(`[like-a-boss] Creating boss profile.. [because ${random} < or = ${chance} (${scavKarmaLevel} karma)]`, LTColor.LogTextColor.CYAN);
            this.generateBossProfile(profile.characters, sessionID);
        } else {
            this.Logger.log(`[like-a-boss] Creating scav profile.. [because ${random} > ${chance} (${scavKarmaLevel} karma)]`, LTColor.LogTextColor.CYAN);
            this.generateScavProfile(profile.characters, sessionID);
        }
    }

    generateBossProfile(chracters, session)
    {
        const bosses = this.CFG.boss_list
        const randomBotType = bosses[this.RandomUtil.getInt(0, bosses.length - 1)].toString().toLowerCase();
        const bossTemplate = this.JsonUtil.clone(this.BotHelper.getBotTemplate(randomBotType));
        const generatedBossData = this.BotGenerator.generatePlayerScav(session, randomBotType, "easy", bossTemplate);
        this.generateSavageProfile(chracters, generatedBossData, session);
    }

    generateScavProfile(chracters, session)
    {
        const generatedProfile = this.PlayerScavGenerator.generate(session);
        this.generateSavageProfile(chracters, generatedProfile, session);
    }

    getScavKarmaLevel(pmcData)
    {
        const fenceInfo = pmcData.TradersInfo["579dc571d53a0658a154fbec"];

        if (!fenceInfo)
        {
            return 0;
        }

        if (fenceInfo.standing < 0)
        {
            return 0;
        }

        if (fenceInfo.standing > 6)
        {
            return 6;
        }
        return Math.floor(fenceInfo.standing);
    }

    generateItemCopy(templateId, itemId, itemProps)
    {
        const data = this.DataBase.getTables();
        const item = this.JsonUtil.clone(data.templates.items[templateId]);

        item._id = itemId;
        for (const value of Object.keys(itemProps)) {
            item._props[value] = itemProps[value];
        }
        data.templates.items[item._id] = item;

        const locales = Object.values(data.locales.global);
        for (const locale of locales) {
            locale[`${itemId} Name`] = locale[`${templateId} Name`];
            locale[`${itemId} ShortName`] = locale[`${templateId} ShortName`];
            locale[`${itemId} Description`] = locale[`${templateId} Description`];
        }

        return item
    }

    replaceItemByItem(items, fromId, toId)
    {
        for (const value of items) {
            if (value._tpl == fromId) {
                value._tpl = toId;
                break;
            }
        }
    }

    replaceItemBySlot(items, toId, slot)
    {
        for (const value of items) {
            if (value.slotId == slot) {
                value._tpl = toId;
                break;
            }
        }
    }

    generateSavageProfile(characters, template, session)
    {
        const existingPMCData = this.JsonUtil.clone(characters.pmc);
        const existingScavData = this.JsonUtil.clone(characters.scav);

        existingScavData.Info.Nickname = template.Info.Nickname;
        existingScavData.Info.Side = template.Info.Side;
        existingScavData.Info.Voice = template.Info.Voice;

        existingScavData.Customization = template.Customization;

        existingScavData.Health = template.Health;

        existingScavData.Inventory = template.Inventory;

        if (this.CFG.remove_scav_cooldown) {
            existingScavData.Info.SavageLockTime = (Date.now() / 1000) + 1;
        }

        for (const value of existingScavData.Skills.Common) {
            if (value.Id == "BotReload" || value.Id == "BotSound")
            {
                value.Progress = 0;
            }
        }

        const items = existingScavData.Inventory.items

        this.replaceItemBySlot(items, "likeaboss_scavpouch", "SecuredContainer");

        if (this.CFG.hide_exotic_items) {
            const exotic = this.CFG.exotic_items_list
            for (const value of exotic) {
                this.replaceItemByItem(items, value, "likeaboss_" + value);
            }
        }

        if (this.CFG.replace_color_keycards) {
            this.replaceItemByItem(items, "5c1d0c5f86f7744bb2683cf0", "5c94bbff86f7747ee735c08f");
            this.replaceItemByItem(items, "5c1d0d6d86f7744bb2683e1f", "5c94bbff86f7747ee735c08f");
            this.replaceItemByItem(items, "5c1d0dc586f7744baf2e7b79", "5c94bbff86f7747ee735c08f");
            this.replaceItemByItem(items, "5c1d0efb86f7744baf2e7b7b", "5c94bbff86f7747ee735c08f");
            this.replaceItemByItem(items, "5c1d0f4986f7744bb01837fa", "5c94bbff86f7747ee735c08f");
            this.replaceItemByItem(items, "5c1e495a86f7743109743dfb", "5c94bbff86f7747ee735c08f");
        }

        characters.scav = existingScavData;
    }
}

module.exports = { mod: new like_a_boss() };