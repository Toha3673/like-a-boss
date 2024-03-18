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
    SRMService;
    SaveServer;
    HashGen;
    postDBLoad(container) {
        this.CFG = require("../config/config.json");
        this.Logger = container.resolve("WinstonLogger");
        this.DataBase = container.resolve("DatabaseServer");
        this.JsonUtil = container.resolve("JsonUtil");
        this.RandomUtil = container.resolve("RandomUtil");
        this.BotHelper = container.resolve("BotHelper")
        this.BotGenerator = container.resolve("BotGenerator")
        this.SRMService = container.resolve("StaticRouterModService");
        this.SaveServer = container.resolve("SaveServer");
        this.HashGen = container.resolve("HashUtil");

        const props = {"IsUnbuyable": true, "IsUndiscardable": true, "IsUngivable": true, "IsUnremovable": true, "IsUnsaleable": true, "NotShownInSlot": true, "ExaminedByDefault": true}

        this.generateItemCopy("5732ee6a24597719ae0c0281", "likeaboss_scavpouch", props);

        const exotic = this.CFG.exotic_items_list
        for (const i in exotic) {
            this.generateItemCopy(exotic[i], `likeaboss_${exotic[i]}`, props);
        }

        this.Logger.log("[like-a-boss] has been loaded.", LTColor.LogTextColor.CYAN);
    }
    preAkiLoad(container) {
        const staticroutermodservice = container.resolve("StaticRouterModService");
        staticroutermodservice.registerStaticRouter("LikeABoss_On_Game_Start", [{
            url: "/client/game/start",
            action: (url, info, sessionID, output) => {
                if (this.CFG.reroll_on_launch)
                {
                    this.regenerateScavProfile(sessionID);
                }
                return output;
            }
        }],
        "aki");
        staticroutermodservice.registerStaticRouter("LikeABoss_On_Scav_Regenerate", [{
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
        const bosses = this.CFG.boss_list
        const scavKarmaLevel = this.getScavKarmaLevel(profile.characters.pmc);
        const chance = this.CFG.boss_chances[scavKarmaLevel-1]
        if (chance >= this.RandomUtil.getInt(1, 100)) {
            this.Logger.log("[like-a-boss] Creating boss profile..", LTColor.LogTextColor.CYAN);
            const randomBotType = bosses[this.RandomUtil.getInt(0, bosses.length - 1)].toString().toLowerCase();
            this.generateBotProfileObject(profile.characters, randomBotType, sessionID);
        }
    }

    getScavKarmaLevel(pmcData)
    {
        const fenceInfo = pmcData.TradersInfo["579dc571d53a0658a154fbec"];

        if (!fenceInfo)
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
        for (const k in Object.keys(itemProps)) {
            item._props[Object.keys(itemProps)[k]] = itemProps[Object.keys(itemProps)[k]];
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
        for (const i in items) {
            if (items[i]._tpl == fromId) {
                items[i]._tpl = toId;
                break;
            }
        }
    }

    replaceItemBySlot(items, toId, slot)
    {
        for (const i in items) {
            if (items[i].slotId == slot) {
                items[i]._tpl = toId;
                break;
            }
        }
    }

    generateBotProfileObject(characters, bosstype, session)
    {
        const existingPMCData = characters.pmc
        const existingScavData = characters.scav
        const bossTemplate = this.JsonUtil.clone(this.BotHelper.getBotTemplate(bosstype));
        const scavData = this.BotGenerator.generatePlayerScav(session, bosstype, "easy", bossTemplate);
        scavData._id = existingPMCData.savage;
        scavData.aid = session;
        scavData.TradersInfo = this.JsonUtil.clone(existingPMCData.TradersInfo);
        scavData.Skills = this.JsonUtil.clone(existingScavData.Skills);
        scavData.Stats = this.JsonUtil.clone(existingScavData.Stats);
        scavData.Info.Level = existingPMCData.Info.Level;
        scavData.Info.Experience = existingScavData.Info.Experience;
        scavData.Info.Settings = {};

        const items = scavData.Inventory.items

        this.replaceItemBySlot(items, "likeaboss_scavpouch", "SecuredContainer");

        if (this.CFG.hide_exotic_items) {
            const exotic = this.CFG.exotic_items_list
            for (const i in exotic) {
                this.replaceItemByItem(items, exotic[i], "likeaboss_" + exotic[i]);
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

        characters.scav = scavData;
    }
}

module.exports = { mod: new like_a_boss() };