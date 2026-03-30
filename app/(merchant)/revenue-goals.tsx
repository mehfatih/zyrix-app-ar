import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, I18nManager, SafeAreaView, ActivityIndicator, RefreshControl, Alert, Modal } from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { revenueGoalsApi } from '../../services/api'

const isRTL = I18nManager.isRTL

interface Goal { id: string; targetAmount: string; currentAmount: number; currency: string; period: string; status: string; progress: number; daysLeft: number; startDate: string; endDate: string }

export default function RevenueGoalsScreen() {
  const { t } = useTranslation()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ targetAmount: '', period: 'monthly' })

  const fetchData = useCallback(async () => {
    try { const res = await revenueGoalsApi.list(); setGoals(res.goals) } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async () => {
    if (!form.targetAmount) return
    setCreating(true)
    try {
      await revenueGoalsApi.create({ targetAmount: parseFloat(form.targetAmount), period: form.period })
      setShowCreate(false); setForm({ targetAmount: '', period: 'monthly' }); fetchData()
    } catch (e: unknown) { Alert.alert(t('common.error'), e instanceof Error ? e.message : '') }
    setCreating(false)
  }

  const handleDelete = (id: string) => {
    Alert.alert('', t('common.confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), onPress: async () => { await revenueGoalsApi.delete(id); fetchData() } },
    ])
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        <View style={s.header}>
          <Text style={[s.title, isRTL && s.rtl]}>{t('revenue_goals.title')}</Text>
          <TouchableOpacity style={s.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={s.createBtnText}>+ {t('revenue_goals.create')}</Text>
          </TouchableOpacity>
        </View>

        {goals.length === 0 ? (
          <View style={s.center}><Text style={s.emptyText}>{t('revenue_goals.no_goals')}</Text></View>
        ) : goals.map(goal => (
          <View key={goal.id} style={s.card}>
            <View style={[s.cardRow, isRTL && s.cardRowRTL]}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardPeriod}>{t(`revenue_goals.${goal.period}`)}</Text>
                <Text style={s.cardTarget}>{goal.currency} {Number(goal.targetAmount).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {goal.status === 'achieved' ? (
                  <Text style={s.achievedText}>{t('revenue_goals.achieved')}</Text>
                ) : (
                  <Text style={s.daysText}>{goal.daysLeft} {t('revenue_goals.days_left')}</Text>
                )}
              </View>
            </View>
            {/* Progress Bar */}
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${Math.min(goal.progress, 100)}%` }, goal.progress >= 100 && s.progressComplete]} />
            </View>
            <View style={[s.progressRow, isRTL && s.cardRowRTL]}>
              <Text style={s.progressText}>{goal.currency} {goal.currentAmount.toLocaleString()}</Text>
              <Text style={s.progressPercent}>{goal.progress}%</Text>
            </View>
            <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(goal.id)}>
              <Text style={s.deleteBtnText}>{t('common.delete') || 'Delete'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{t('revenue_goals.create')}</Text>
            <TextInput placeholder={t('revenue_goals.target')} value={form.targetAmount} onChangeText={v => setForm({...form, targetAmount: v})} style={s.input} placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
            <View style={[s.intervalRow, isRTL && s.cardRowRTL]}>
              {(['monthly','quarterly','yearly'] as const).map(p => (
                <TouchableOpacity key={p} style={[s.intervalBtn, form.period === p && s.intervalActive]} onPress={() => setForm({...form, period: p})}>
                  <Text style={[s.intervalText, form.period === p && s.intervalTextActive]}>{t(`revenue_goals.${p}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowCreate(false)}><Text style={{color:COLORS.textSecondary}}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalSubmit} onPress={handleCreate} disabled={creating}><Text style={{color:COLORS.white,fontWeight:'700'}}>{creating ? '...' : t('revenue_goals.create')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.deepBg},scroll:{paddingBottom:40},center:{flex:1,justifyContent:'center',alignItems:'center',padding:40},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',padding:20},
  title:{fontSize:22,fontWeight:'700',color:COLORS.textPrimary},rtl:{textAlign:'right'},
  createBtn:{backgroundColor:COLORS.primary,paddingHorizontal:14,paddingVertical:10,borderRadius:10},
  createBtnText:{color:COLORS.white,fontSize:13,fontWeight:'600'},emptyText:{color:COLORS.textMuted,fontSize:15},
  card:{backgroundColor:COLORS.cardBg,marginHorizontal:16,marginBottom:12,borderRadius:14,borderWidth:1,borderColor:COLORS.border,padding:16},
  cardRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},cardRowRTL:{flexDirection:'row-reverse'},
  cardPeriod:{fontSize:12,color:COLORS.textMuted,textTransform:'uppercase',fontWeight:'600',marginBottom:4},
  cardTarget:{fontSize:24,fontWeight:'800',color:COLORS.textPrimary},
  daysText:{fontSize:12,color:COLORS.textSecondary},achievedText:{fontSize:14,fontWeight:'700',color:COLORS.success},
  progressBg:{height:8,backgroundColor:COLORS.border,borderRadius:4,marginTop:12,overflow:'hidden'},
  progressFill:{height:8,backgroundColor:COLORS.primary,borderRadius:4},progressComplete:{backgroundColor:COLORS.success},
  progressRow:{flexDirection:'row',justifyContent:'space-between',marginTop:6},
  progressText:{fontSize:12,color:COLORS.textSecondary},progressPercent:{fontSize:12,fontWeight:'700',color:COLORS.primary},
  deleteBtn:{marginTop:10,alignSelf:'flex-start',paddingHorizontal:12,paddingVertical:6,borderRadius:6,backgroundColor:COLORS.dangerBg},
  deleteBtnText:{fontSize:12,color:COLORS.danger,fontWeight:'600'},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
  modal:{backgroundColor:COLORS.cardBg,borderTopLeftRadius:20,borderTopRightRadius:20,padding:24},
  modalTitle:{fontSize:20,fontWeight:'700',color:COLORS.textPrimary,marginBottom:20,textAlign:'center'},
  input:{backgroundColor:COLORS.surfaceBg,borderWidth:1,borderColor:COLORS.border,borderRadius:10,paddingHorizontal:16,paddingVertical:14,color:COLORS.textPrimary,fontSize:15,marginBottom:12},
  intervalRow:{flexDirection:'row',gap:8,marginBottom:12},intervalBtn:{flex:1,paddingVertical:10,borderRadius:8,borderWidth:1,borderColor:COLORS.border,alignItems:'center'},
  intervalActive:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},intervalText:{fontSize:13,color:COLORS.textSecondary,fontWeight:'600'},
  intervalTextActive:{color:COLORS.white},modalActions:{flexDirection:'row',gap:12,marginTop:8},
  modalCancel:{flex:1,paddingVertical:14,borderRadius:10,alignItems:'center',backgroundColor:COLORS.surfaceBg},
  modalSubmit:{flex:1,paddingVertical:14,borderRadius:10,alignItems:'center',backgroundColor:COLORS.primary},
})
